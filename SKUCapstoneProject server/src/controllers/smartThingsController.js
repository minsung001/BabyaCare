const axios = require('axios');
const SmartThings = require('../models/SmartThings');
const User = require('../models/User');

const ST_API = 'https://api.smartthings.com/v1';
const automationState = new Map();

const numberFromEnv = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) ? value : fallback;
};

const hasCapability = (device, capability) => {
    return (device.components || []).some(component =>
        (component.capabilities || []).some(item => item.id === capability)
    );
};

const mapDevice = (device) => ({
    deviceId: device.deviceId,
    name: device.name,
    label: device.label || device.name,
    deviceTypeName: device.deviceTypeName,
    locationId: device.locationId,
    capabilities: (device.components || []).flatMap(component =>
        (component.capabilities || []).map(capability => capability.id)
    )
});

const findSmartThingsInfo = async (ownerKey) => {
    const byEmail = await SmartThings.findOne({ userEmail: ownerKey });
    if (byEmail) return byEmail;

    if (/^[0-9a-fA-F]{24}$/.test(String(ownerKey))) {
        return SmartThings.findOne({ userId: ownerKey });
    }

    return null;
};

const getDevices = async (patToken) => {
    const response = await axios.get(`${ST_API}/devices`, {
        headers: { Authorization: `Bearer ${patToken}` },
        timeout: 7000
    });

    return response.data.items || [];
};

const resolveSwitchDeviceId = async (patToken, preferredDeviceId) => {
    if (preferredDeviceId) return preferredDeviceId;

    const devices = await getDevices(patToken);
    const switchDevice = devices.find(device => hasCapability(device, 'switch'));
    return switchDevice?.deviceId || devices[0]?.deviceId || null;
};

const sendSmartThingsCommand = async (patToken, { deviceId, capability, command, args = [] }) => {
    if (!deviceId || !capability || !command) {
        throw new Error('deviceId, capability, command are required.');
    }

    await axios.post(
        `${ST_API}/devices/${deviceId}/commands`,
        {
            commands: [{
                component: 'main',
                capability,
                command,
                arguments: args
            }]
        },
        { headers: { Authorization: `Bearer ${patToken}` }, timeout: 7000 }
    );
};

const runSwitchAutomation = async ({ stInfo, deviceId, stateKey, shouldTurnOn, reason }) => {
    if (!deviceId) return null;

    const nextCommand = shouldTurnOn ? 'on' : 'off';
    if (automationState.get(stateKey) === nextCommand) return null;

    await sendSmartThingsCommand(stInfo.patToken, {
        deviceId,
        capability: 'switch',
        command: nextCommand
    });

    automationState.set(stateKey, nextCommand);
    return { deviceId, command: nextCommand, reason };
};

const resolveActionCommand = async (stInfo, action, fallbackDeviceId) => {
    const coolingDeviceId = await resolveSwitchDeviceId(
        stInfo.patToken,
        process.env.ST_COOLING_DEVICE_ID || fallbackDeviceId
    );
    const humidifierDeviceId = await resolveSwitchDeviceId(
        stInfo.patToken,
        process.env.ST_HUMIDIFIER_DEVICE_ID || fallbackDeviceId
    );

    const actionMap = {
        cooling_on: { deviceId: coolingDeviceId, capability: 'switch', command: 'on' },
        cooling_off: { deviceId: coolingDeviceId, capability: 'switch', command: 'off' },
        humidifier_on: { deviceId: humidifierDeviceId, capability: 'switch', command: 'on' },
        humidifier_off: { deviceId: humidifierDeviceId, capability: 'switch', command: 'off' }
    };

    return actionMap[action] || null;
};

exports.applySensorAutomation = async ({ userId, temperature, humidity }) => {
    const stInfo = await findSmartThingsInfo(userId);
    if (!stInfo || !stInfo.patToken) return [];

    const tempOn = numberFromEnv('ST_TEMP_ON', 28);
    const tempOff = numberFromEnv('ST_TEMP_OFF', 26);
    const humidOn = numberFromEnv('ST_HUMIDITY_ON', 40);
    const humidOff = numberFromEnv('ST_HUMIDITY_OFF', 55);

    const coolingDeviceId = await resolveSwitchDeviceId(stInfo.patToken, process.env.ST_COOLING_DEVICE_ID);
    const humidifierDeviceId = await resolveSwitchDeviceId(stInfo.patToken, process.env.ST_HUMIDIFIER_DEVICE_ID);
    const actions = [];

    if (Number.isFinite(Number(temperature)) && coolingDeviceId) {
        if (temperature >= tempOn) {
            const result = await runSwitchAutomation({
                stInfo,
                deviceId: coolingDeviceId,
                stateKey: `${stInfo.userEmail}:cooling`,
                shouldTurnOn: true,
                reason: `temperature ${temperature} >= ${tempOn}`
            });
            if (result) actions.push(result);
        } else if (temperature <= tempOff) {
            const result = await runSwitchAutomation({
                stInfo,
                deviceId: coolingDeviceId,
                stateKey: `${stInfo.userEmail}:cooling`,
                shouldTurnOn: false,
                reason: `temperature ${temperature} <= ${tempOff}`
            });
            if (result) actions.push(result);
        }
    }

    if (Number.isFinite(Number(humidity)) && humidifierDeviceId) {
        if (humidity <= humidOn) {
            const result = await runSwitchAutomation({
                stInfo,
                deviceId: humidifierDeviceId,
                stateKey: `${stInfo.userEmail}:humidifier`,
                shouldTurnOn: true,
                reason: `humidity ${humidity} <= ${humidOn}`
            });
            if (result) actions.push(result);
        } else if (humidity >= humidOff) {
            const result = await runSwitchAutomation({
                stInfo,
                deviceId: humidifierDeviceId,
                stateKey: `${stInfo.userEmail}:humidifier`,
                shouldTurnOn: false,
                reason: `humidity ${humidity} >= ${humidOff}`
            });
            if (result) actions.push(result);
        }
    }

    return actions;
};

exports.registerSmartThings = async (req, res) => {
    const { token, email } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!token || token.length < 10) {
        return res.status(400).json({
            ok: false,
            message: 'Please enter a valid SmartThings token.'
        });
    }

    try {
        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({ ok: false, message: 'User not found.' });
        }

        const devices = await getDevices(token);
        const updatedData = await SmartThings.findOneAndUpdate(
            { userId },
            { userEmail: email, patToken: token, deviceCount: devices.length, updatedAt: Date.now() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log('[ST_REGISTER] saved:', updatedData._id, 'devices:', devices.length);

        return res.status(200).json({
            ok: true,
            message: 'SmartThings registration complete.',
            devices: devices.map(mapDevice)
        });
    } catch (error) {
        console.error('[ST_REGISTER_ERROR]', error.response?.status || error.message);
        if (error.response) {
            return res.status(401).json({ ok: false, message: 'SmartThings token is invalid or expired.' });
        }
        if (error.request) {
            return res.status(503).json({ ok: false, message: 'Could not connect to SmartThings API.' });
        }
        return res.status(500).json({ ok: false, message: 'Server error while registering SmartThings.' });
    }
};

exports.getUserDevices = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const stInfo = await findSmartThingsInfo(userId);

        if (!stInfo || !stInfo.patToken) {
            return res.status(200).json({ ok: true, devices: [], message: 'No SmartThings token registered.' });
        }

        const devices = (await getDevices(stInfo.patToken)).map(device => ({
            ...mapDevice(device),
            status: 'online'
        }));

        return res.status(200).json({ ok: true, devices });
    } catch (error) {
        console.error('[ST_GET_ERROR]', error.message);
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ ok: false, message: 'SmartThings authentication expired.' });
        }
        return res.status(500).json({ ok: false, message: 'Failed to load SmartThings devices.' });
    }
};

exports.getDeviceStatus = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { deviceId } = req.params;

        const stInfo = await findSmartThingsInfo(userId);
        if (!stInfo || !stInfo.patToken) {
            return res.status(404).json({ ok: false, message: 'SmartThings token is missing.' });
        }

        const response = await axios.get(
            `${ST_API}/devices/${deviceId}/status`,
            { headers: { Authorization: `Bearer ${stInfo.patToken}` }, timeout: 7000 }
        );

        res.status(200).json({ ok: true, deviceId, components: response.data.components });
    } catch (error) {
        console.error('[ST_STATUS_ERROR]', error.message);
        res.status(500).json({ ok: false, message: error.message });
    }
};

exports.controlDevice = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { action, deviceId, capability, command, args } = req.body;

        const stInfo = await findSmartThingsInfo(userId);
        if (!stInfo || !stInfo.patToken) {
            return res.status(404).json({ ok: false, message: 'SmartThings token is missing.' });
        }

        const commandBody = action
            ? await resolveActionCommand(stInfo, action, deviceId)
            : { deviceId, capability, command, args: Array.isArray(args) ? args : [] };

        if (!commandBody || !commandBody.deviceId || !commandBody.capability || !commandBody.command) {
            return res.status(400).json({ ok: false, message: 'Unsupported SmartThings command.' });
        }

        await sendSmartThingsCommand(stInfo.patToken, commandBody);

        console.log(`[ST_CONTROL] ${commandBody.deviceId} ${commandBody.capability}.${commandBody.command}`);

        res.status(200).json({
            ok: true,
            action: action || null,
            deviceId: commandBody.deviceId,
            capability: commandBody.capability,
            command: commandBody.command,
            message: 'SmartThings command sent.'
        });
    } catch (error) {
        console.error('[ST_CONTROL_ERROR]', error.response?.data || error.message);
        res.status(500).json({ ok: false, message: error.message });
    }
};

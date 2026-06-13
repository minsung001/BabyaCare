const mqtt = require('mqtt');
const temhuController = require('./controllers/TemhuController');

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_TOPIC_ENV = process.env.MQTT_TOPIC_ENV || 'baby/environment';
const DEFAULT_IOT_USER_ID = process.env.IOT_DEFAULT_USER_ID || 'lkms1472';

let client;

const parsePayload = (message) => {
    const payload = JSON.parse(message.toString());
    const temperature = Number(payload.temperature);
    const humidity = Number(payload.humidity);

    if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) {
        throw new Error('Invalid environment payload.');
    }

    return {
        userId: payload.userId || DEFAULT_IOT_USER_ID,
        temperature,
        humidity
    };
};

exports.init = (app) => {
    if (client) return client;

    client = mqtt.connect(MQTT_BROKER_URL, {
        reconnectPeriod: 5000
    });

    client.on('connect', () => {
        console.log(`[MQTT] connected: ${MQTT_BROKER_URL}`);
        client.subscribe(MQTT_TOPIC_ENV, (error) => {
            if (error) {
                console.error('[MQTT] subscribe failed:', error.message);
                return;
            }

            console.log(`[MQTT] subscribed: ${MQTT_TOPIC_ENV}`);
        });
    });

    client.on('message', async (topic, message) => {
        if (topic !== MQTT_TOPIC_ENV) return;

        try {
            const data = parsePayload(message);
            await temhuController.saveSensorReading({
                ...data,
                io: app.get('io')
            });
        } catch (error) {
            console.error('[MQTT_ENV_ERROR]', error.message);
        }
    });

    client.on('error', (error) => {
        console.error('[MQTT] error:', error.message);
    });

    return client;
};

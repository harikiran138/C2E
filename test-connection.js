const { Client } = require('pg');

const tryConnect = async (region) => {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Trying ${host}...`);
    const connectionString = `postgres://postgres.ncofwpuabtxddvdjljgj:w8HpdxF%2FCiGp_sn@${host}:6543/postgres`;

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`Connected successfully to ${region} pooler!`);
        const res = await client.query('SELECT NOW()');
        console.log("Time:", res.rows[0].now);
        await client.end();
        return true;
    } catch (err) {
        console.error(`Connection failed to ${region}:`, err.message);
        await client.end();
        return false;
    }
};

(async () => {
    const regions = ['us-east-1', 'eu-central-1', 'ap-southeast-1', 'sa-east-1'];
    for (const region of regions) {
        if (await tryConnect(region)) break;
    }
})();

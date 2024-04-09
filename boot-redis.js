const fs = require('fs');
const { exec } = require('child_process');

const REDIS_CONFIG_BASE_FILE = './redis.conf';
const REDIS_SERVER_CONFIG_BASE_FILE = './redis-server-base.conf';
const REDIS_CLUSTER_CONFIG_BASE_FILE = './redis-cluster-base.conf';

const REDIS_CLUSTER_TMP_PATH = './redis/';
const INPUT_JSON_FILE = './ch-config.json';
const jsonData = JSON.parse(fs.readFileSync(INPUT_JSON_FILE, 'utf8'));

if (!fs.existsSync(REDIS_CLUSTER_TMP_PATH)) {
  fs.mkdirSync(REDIS_CLUSTER_TMP_PATH, { recursive: true });
}

const flushRedisServer = ({ host, port }) => {
  return new Promise((resolve, reject) => {
    exec(`redis-cli -h ${host} -p ${port} flushall`, (error, stdout) => {
      if (error) {
        console.error(`Failed to flush Redis server at ${host}:${port}`, error);
        reject(error);
      } else {
        console.log(`Redis server at ${host}:${port} flushed`);
        resolve();
      }
    });
  });
};

const startRedisServer = ({ host, port }, isCluster = false) => {
  const tempConfigFile = `${REDIS_CLUSTER_TMP_PATH}${port}/redis-server.conf`;

  if (!fs.existsSync(`${REDIS_CLUSTER_TMP_PATH}${port}/`)) {
    fs.mkdirSync(`${REDIS_CLUSTER_TMP_PATH}${port}/`, { recursive: true });
  }

  if (isCluster) {
    fs.copyFileSync(REDIS_CLUSTER_CONFIG_BASE_FILE, tempConfigFile);
    fs.appendFileSync(tempConfigFile, `\ncluster-enabled yes`);
    fs.appendFileSync(tempConfigFile, `\ncluster-config-file ${REDIS_CLUSTER_TMP_PATH}${port}/nodes.conf`);
    fs.appendFileSync(tempConfigFile, `\ncluster-node-timeout 5000`);
    fs.appendFileSync(tempConfigFile, `\nport ${port}`);
  } else {
    fs.copyFileSync(REDIS_SERVER_CONFIG_BASE_FILE, tempConfigFile);
    fs.appendFileSync(tempConfigFile, `\nport ${port}`);
  }

  console.log(`Starting Redis server on ${host}:${port}`);
  exec(`redis-server ${tempConfigFile} &`);
};

const checkRedisServer = ({ host, port }) => {
  return new Promise((resolve, reject) => {
    const check = () => {
      exec(`redis-cli -h ${host} -p ${port} ping`, (error, stdout) => {
        if (!error && stdout.includes('PONG')) {
          console.log(`Redis server at ${host}:${port} is responsive`);
          resolve();
        } else {
          setTimeout(check, 1000); // Try again in 1 second
        }
      });
    };
    check();
  });
};

const resetRedisServer = async ({ host, port }) => {
  await new Promise((resolve, reject) => {
    exec(`redis-cli -h ${host} -p ${port} cluster reset`, (error, stdout) => {
      if (error) {
        console.error(`Failed to reset Redis server at ${host}:${port}`, error);
        reject(error);
      } else {
        console.log(`Redis server at ${host}:${port} reset successfully`);
        resolve();
      }
    });
  });
};

const startAndCheckAllRedisServers = async (redisArray) => {
  for (let redisConfig of redisArray) {
    await startAndCheckAllRedisServer(redisConfig, true);
  }
};

const startAndCheckAllRedisServer = async ({ host, port }, isCluster = false) => {
  startRedisServer({ host, port }, isCluster);
  await checkRedisServer({ host, port });
  await flushRedisServer({ host, port });
  await resetRedisServer({ host, port });
};

const createRedisCluster = async (redisArray) => {
  const nodeArgs = redisArray.map(({ host, port }) => `${host}:${port}`).join(' ');

  console.log('Creating Redis cluster...', `redis-cli --cluster create ${nodeArgs} --cluster-replicas 1`);

  exec(`echo "yes" | redis-cli --cluster create ${nodeArgs} --cluster-replicas 1`, (error, stdout, stderr) => {
    if (error || stderr) {
      console.error('Failed to create Redis cluster:', error, stderr);
    } else {
      console.log('Redis cluster created successfully:', stdout);
    }
  });
};

const processNodes = async (node) => {
  if (node.redis) {
    console.log('@@@@@@@@@@', node.nginx.location, '@@@@@@@@@@');
    await startAndCheckAllRedisServer(node.redis.client);
    await startAndCheckAllRedisServers(node.redis.cluster);
    await createRedisCluster(node.redis.cluster);
  }

  if (node.children) {
    for (let child of node.children) {
      await processNodes(child);
    }
  }
};

const main = async () => {
  await processNodes(jsonData);
};

main().catch(console.error);

const c = require('ansi-colors');
const os = require('os');
const path = require('path');
const { prompt } = require('enquirer');
const mergeOptions = require('merge-options');

const db = require('../db');
const buildMap = require('../util/build-map');
const chooseDb = require('../task/choose-db');
const filterKeys = require('../util/filter-keys');
const isSuperUser = require('../task/is-super-user');
const promptForVars = require('../util/prompt-for-vars');
const findProjectRoot = require('../util/find-project-root');

const configExists = require('../pgshrc/exists');
const defaultConfig = require('../pgshrc/default');
const createConfig = require('../pgshrc/create');
const createEnv = require('../env/create');
const parseEnv = require('../env/parse');

const DEFAULT_USER = os.userInfo().username;
const DEFAULT_DATABASE = path.basename(findProjectRoot());

const ENV_DEFAULTS = {
  user: DEFAULT_USER,
  password: '',
  host: 'localhost',
  port: '5432',
  database: DEFAULT_DATABASE,
  url: `postgres://${DEFAULT_USER}:@localhost:5432/${DEFAULT_DATABASE}`,
};

const URL_DEFAULT_VARS = {
  url: defaultConfig.vars.url,
};

const SPLIT_DEFAULT_VARS = {
  host: defaultConfig.vars.host,
  port: defaultConfig.vars.port,
  user: defaultConfig.vars.user,
  password: defaultConfig.vars.password,
  database: defaultConfig.vars.database,
};

const SUPERUSER_DEFAULT_VARS = {
  super_user: defaultConfig.vars.super_user,
  super_password: defaultConfig.vars.super_password,
};

const URL_PROMPTS = [
  { name: 'url', description: 'connection URL' },
];

const isNumeric = x => x === `${+x}`;

// TODO:
// - how can we get a password in a form?
// - use the "snippet" prompt for the no-.env url mode
// - finish the superuser stuff
// - test the crap out of it!
const SPLIT_PROMPTS = [
  { name: 'database', description: 'database name' },
  { name: 'host', description: 'hostname (e.g. localhost)', initial: 'localhost' },
  {
    name: 'port',
    description: 'port (e.g. 5432)',
    initial: '5432',
    validate: isNumeric,
    skippable: true,
  },
  { name: 'user', description: 'username', skippable: true },
  { name: 'password', description: 'password', skippable: true },
];

const SUPERUSER_PROMPTS = [
  { name: 'super_user', description: 'superuser name' },
  { name: 'super_password', description: 'superuser password' },
];

const selectToForm = ({ description, ...rest }) => ({
  message: description,
  ...rest,
});

// eslint-disable-next-line
const SUPERUSER_FAILURE_MESSAGE =
  'Either add variables for a superuser name and password'
  + ` to ${c.underline('.env')}, or modify your existing`
  + ' variables to connect as a superuser.';

exports.command = 'init';
exports.desc = 'generates .pgshrc / .env files conversationally';
exports.builder = {};

const makeConfig = (mode, vars) =>
  mergeOptions(
    defaultConfig,
    { mode, vars },
  );

const makeDb = (mode, vars) =>
  db(makeConfig(mode, vars));

const ensureSuperUser = async (initDb, existingEnv) => {
  if (await isSuperUser(initDb)()) {
    return {};
  }

  const { user } = initDb.explodeUrl(initDb.thisUrl());
  console.log();
  console.log(
    `You are connecting as a non-superuser ${c.greenBright(user)},`,
    'which will prevent pgsh from successfully cloning databases.',
  );

  if (!existingEnv) {
    throw new Error(SUPERUSER_FAILURE_MESSAGE);
  }

  try {
    const { config } = initDb;

    if (existingEnv) {
      // if we have an existing .env, ask which variables correspond
      console.log(
        `You will need to choose which variables in ${c.underline('.env')}`
          + ' contain your superuser name and password.',
      );
      const extraVars = await promptForVars(
        filterKeys(existingEnv, k => !Object.values(config.vars).includes(k)),
        SUPERUSER_PROMPTS,
      );
      return { vars: extraVars };
    }

    // if not, ask for the values directly
    const { extraEnv } = await prompt({
      type: 'form',
      name: 'extraEnv',
      message: `Please enter superuser credentials for ${config.vars.host}:${config.vars.port}`,
      choices: SUPERUSER_PROMPTS.map(selectToForm),
    });
    console.log(extraEnv);
    return {
      env: extraEnv,
      vars: SUPERUSER_DEFAULT_VARS,
    };
  } catch (err) {
    throw new Error(SUPERUSER_FAILURE_MESSAGE);
  }
};

exports.handler = async () => {
  if (configExists) {
    console.error(
      `${c.underline('.pgshrc')} already exists! Exiting.`,
    );
    return process.exit(1);
  }

  console.log(
    `${c.yellowBright('pgsh')} manages your database`,
    `connection via variables in ${c.underline('.env')}.`,
  );

  try {
    console.log(
      `In ${c.cyan('url')} mode, one variable holds the entire`,
      'connection string.',
    );
    console.log(
      `In ${c.cyan('split')} mode, you have separate variables for`,
      'user, host, password, etc.\n',
    );

    const { mode } = await prompt(
      {
        name: 'mode',
        type: 'select',
        message: 'Which mode would you like to use?',
        choices: ['url', 'split'],
      },
    );

    // skip the rest of the wizard if there's no .env file; create
    // with our defaults and let the user change it if they want
    const existingEnv = parseEnv();
    if (!existingEnv) {
      // interactively fill in variables
      const { values } = await prompt({
        type: 'form',
        name: 'values',
        message: 'Please provide the following information:',
        choices: mode === 'url' ? URL_PROMPTS : SPLIT_PROMPTS,
      });
      console.log(values);
      process.exit(0);

      const vars = mode === 'url'
        ? URL_DEFAULT_VARS
        : SPLIT_DEFAULT_VARS;

      // inject the default env into our process so we can
      // bootstrap the db with our .pgshrc variables
      const env = { ...ENV_DEFAULTS };
      Object.entries(buildMap(vars, env))
        .forEach(([k, v]) => {
          process.env[k] = v;
        });

      // ready for our bootstrapped db
      const initDb = makeDb(mode, vars);

      // ask the user which db to connect to / create / clone
      const { database, config: extraConfig } = await chooseDb(initDb)();

      // add in our database choice to the env vars we're writing
      env.database = database;
      env.url = initDb.combineUrl(env);

      createEnv(buildMap(vars, env));
      createConfig({
        ...extraConfig,
        mode,
        vars,
      });
      console.log(
        `${c.underline('.pgshrc')} and ${c.underline('.env')} created!`,
      );

      console.log(
        'Now, configure your application to use the values',
        `in your ${c.underline('.env')} file.`,
      );
      return process.exit(0);
    }

    // ask the user which variables in their .env file
    // correspond to which database connection parameters
    const userVars = await promptForVars(
      existingEnv,
      mode === 'url' ? URL_PROMPTS : SPLIT_PROMPTS,
    );

    // merge in vars needed for superuser or fail out
    const vars = {
      ...userVars,
      ...(await ensureSuperUser(makeDb(mode, userVars), existingEnv)),
    };
    console.log();

    // bootstrap "db" with our mode / vars and the existing
    // environment (already injected into our process by dotenv.config())
    const initDb = makeDb(mode, vars);

    // figure out where the user wants to switch to and do it
    const { database, config: extraConfig } = await chooseDb(initDb)(initDb.thisDb());
    initDb.switchTo(database);

    createConfig({
      ...extraConfig,
      mode,
      vars,
    });
    console.log(`${c.underline('.pgshrc')} created!`);

    return process.exit(0);
  } catch (err) {
    console.error(
      `pgsh init failed: ${c.redBright(err.message)}`,
    );
    return process.exit(2);
  }
};

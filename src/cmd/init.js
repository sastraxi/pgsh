const c = require('ansi-colors');
const os = require('os');
const path = require('path');
const { prompt } = require('enquirer');
const mergeOptions = require('merge-options');

const dbFactory = require('../db');
const addAll = require('../util/add-all');
const buildMap = require('../util/build-map');
const buildUrl = require('../util/build-url');
const chooseDb = require('../task/choose-db');
const filterKeys = require('../util/filter-keys');
const isPrivileged = require('../task/is-privileged');
const randomString = require('../util/random-string');
const promptForVars = require('../util/prompt-for-vars');
const promptForInput = require('../util/prompt-for-input');
const findProjectRoot = require('../util/find-project-root');

const configExists = require('../pgshrc/exists');
const defaultConfig = require('../pgshrc/default');
const createConfig = require('../pgshrc/create');
const stringifyEnv = require('../util/stringify-env');
const createEnv = require('../env/create');
const parseEnv = require('../env/parse');

const TEMP_DB_NAME_LENGTH = 30;
const DEFAULT_USER = os.userInfo().username;
const DEFAULT_DATABASE = path.basename(findProjectRoot());

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
  super_user: defaultConfig.vars.super_user || 'PG_SUPER_USER',
  super_password: defaultConfig.vars.super_password || 'PG_SUPER_PASSWORD',
};

const URL_PROMPTS = [
  {
    name: 'url',
    description: 'connection URL',
    initial: `postgres://${DEFAULT_USER}@localhost/${DEFAULT_DATABASE}`,
  },
];

const isNumeric = x => x === `${+x}`;

const injectEnv = (vars, env) =>
  Object.entries(buildMap(vars, env))
    .forEach(([k, v]) => {
      process.env[k] = v;
    });

const SPLIT_PROMPTS = [
  {
    name: 'database',
    description: 'database name',
    initial: DEFAULT_DATABASE,
  },
  {
    name: 'host',
    description: 'hostname (e.g. localhost)',
    initial: 'localhost',
  },
  {
    name: 'port',
    description: 'port (e.g. 5432)',
    initial: 5432,
    validate: isNumeric,
    skippable: true,
  },
  {
    name: 'user',
    description: 'username',
    skippable: true,
  },
  {
    name: 'password',
    description: 'password',
    type: 'password',
    skippable: true,
  },
];

const SUPERUSER_PROMPTS = [
  {
    name: 'super_user',
    description: 'superuser name',
  },
  {
    name: 'super_password',
    description: 'superuser password',
    type: 'password',
    skippable: true,
  },
];

exports.command = 'init';
exports.desc = 'generates .pgshrc / .env files conversationally';
exports.builder = {};

const makeConfig = (mode, vars) =>
  mergeOptions(
    defaultConfig,
    { mode, vars },
  );

const makeDb = (mode, vars) =>
  dbFactory(makeConfig(mode, vars));

/**
 * @returns { vars, env } always
 */
const ensureSuperUser = async (initDb, envChoices) => {
  if (await isPrivileged(initDb)()) {
    // the given user has enough permissions
    return {
      env: {},
      vars: {},
    };
  }

  const { user } = initDb.explodeUrl(initDb.thisUrl());
  console.log();
  console.log(
    `You are connecting as an underprivileged user ${c.greenBright(user)}.`,
  );
  console.log(
    'This will prevent pgsh from successfully cloning databases.',
  );

  try {
    const { config } = initDb;

    console.log();
    const { fix } = await prompt({
      type: 'toggle',
      name: 'fix',
      message: 'Do you have access to superuser credentials?',
    });

    if (!fix) {
      // user wants to go ahead without figuring things out
      console.log();
      console.log('For full pgsh functionality, modify your existing user via psql:');
      console.log(`# ALTER ROLE ${user} CREATEDB`);
      return {
        env: {},
        vars: {},
      };
    }

    if (envChoices) {
      // if we have an existing .env, ask which variables correspond
      console.log(
        `You will need to choose which variables in ${c.underline('.env')}`
          + ' contain your superuser name and password.',
      );
      console.log();
      const extraVars = await promptForVars(
        filterKeys(envChoices, k => !Object.values(config.vars).includes(k)),
        SUPERUSER_PROMPTS,
      );
      return {
        env: {},
        vars: extraVars,
      };
    }

    // if not, ask for the values directly
    console.log(
      'Please enter superuser credentials for',
      `${process.env[config.vars.host]}:${process.env[config.vars.port] || '5432'}`,
    );
    console.log();
    const extraEnv = await promptForInput(SUPERUSER_PROMPTS);
    return {
      env: filterKeys(extraEnv, key => !!extraEnv[key]),
      vars: filterKeys(SUPERUSER_DEFAULT_VARS, key => (key in extraEnv)),
    };
  } catch (err) {
    throw new Error(
      'Either add variables for a superuser name and password '
        + `to ${c.underline('.env')}, or modify your existing user `
        + `with ALTER ROLE ${user} CREATEDB.`,
    );
  }
};

exports.handler = async () => {
  if (configExists) {
    const existingEnv = parseEnv();

    // if both .pgshrc and .env exist, show the choose prompt
    if (existingEnv) {
      const db = dbFactory();
      const { database } = await chooseDb(db)(db.thisDb());
      db.switchTo(database);
      return process.exit(0);
    }

    // otherwise, inform the user they'll need to create a .env file
    const config = require('../pgshrc/read');
    const envMap = {};
    Object.values(config.vars).forEach((envKey) => {
      envMap[envKey] = '';
    });

    console.log(c.yellowBright(
      `${c.underline('.pgshrc')} exists, but ${c.underline('.env')} does not!`,
    ));
    console.log('Try creating one, e.g.\n');
    console.log(stringifyEnv(envMap));
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
      // interactively fill in env variables; a real db will be chosen later
      const userValues = {
        ...(await promptForInput(SPLIT_PROMPTS.filter(p => p.name !== 'database'))),
        database: randomString(TEMP_DB_NAME_LENGTH),
      };

      // make env from their choice
      const env = mode === 'url'
        ? { url: buildUrl(userValues) }
        : userValues; // split mode can use values directly

      // only create variables for env the user is interested in
      const vars = filterKeys(
        mode === 'url'
          ? URL_DEFAULT_VARS
          : SPLIT_DEFAULT_VARS,
        key => (key in env),
      );

      // inject user env into our process so we can
      // bootstrap the db with our .pgshrc variables
      injectEnv(vars, env);

      // check for super-user access, merge in new env / vars
      const suProps = await ensureSuperUser(makeDb(mode, vars));
      if (suProps) {
        console.log();
        addAll(vars, suProps.vars);
        addAll(env, suProps.env);
        injectEnv(suProps.vars, suProps.env);
      }

      // ready for our fully-bootstrapped db
      const initDb = makeDb(mode, vars);

      // ask the user which db to connect to / create / clone
      const { database, config: extraConfig } = await chooseDb(initDb)();

      // add in our database choice to the env vars we're writing
      env.database = database;
      env.url = initDb.thisUrl(database);

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
      ...(await ensureSuperUser(makeDb(mode, userVars), existingEnv)).vars,
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

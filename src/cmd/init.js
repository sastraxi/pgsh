const c = require('ansi-colors');
const path = require('path');
const Bluebird = require('bluebird');
const { prompt } = require('enquirer');
const mergeOptions = require('merge-options');

const db = require('../db');
const buildMap = require('../util/build-map');
const chooseDb = require('../task/choose-db');
const findProjectRoot = require('../util/find-project-root');

const configExists = require('../pgshrc/exists');
const defaultConfig = require('../pgshrc/default');
const createConfig = require('../pgshrc/create');
const createEnv = require('../env/create');
const parseEnv = require('../env/parse');

const DEFAULT_DATABASE = path.basename(findProjectRoot());

const ENV_DEFAULTS = {
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: '5432',
  database: DEFAULT_DATABASE,
  url: `postgres://postgres:postgres@localhost:5432/${DEFAULT_DATABASE}`,
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

const URL_PROMPTS = [
  { name: 'url', description: 'connection URL' },
];

const SKIP_HINT = c.dim(' (^C to skip)');

const SPLIT_PROMPTS = [
  { name: 'database', description: 'database name' },
  { name: 'host', description: 'hostname (e.g. localhost)' },
  { name: 'port', description: 'port (e.g. 5432)', skippable: true },
  { name: 'user', description: 'username', skippable: true },
  { name: 'password', description: 'password', skippable: true },
];

exports.command = 'init';
exports.desc = 'generates .pgshrc / .env files conversationally';

exports.builder = {};

const varChoices = vars => Object.keys(vars)
  .map(key => ({
    hint: c.dim(`(${vars[key]})`),
    value: key,
  }));

/**
 * Iteratively ask for a number of keys (in order),
 * removing from the potential set every time one is selected.
 *
 * @param {*} vars key/value pairs, e.g. extracted from a .env file
 * @param {*} prompts the things we want to assign, e.g
 *                    [{ name: 'url', description: 'connection URL' }, ...]
 * @returns a mapping from prompt names to the variable key they've chosen
 */
const promptForVars = async (vars, prompts) => {
  const mapping = {};
  let choices = varChoices(vars);
  await Bluebird.map(
    prompts,
    async ({ name, description, skippable }) => {
      try {
        const { selected } = await prompt({
          type: 'select',
          name: 'selected',
          message:
            `Which variable contains the ${description}?${(skippable ? SKIP_HINT : '')}`,
          choices,
        });
        mapping[name] = selected;
        choices = choices.filter(x => x.value !== selected);
      } catch (err) {
        if (!skippable) {
          throw new Error(`skipped non-skippable prompt "${name}"`);
        }
      }
    },
    { concurrency: 1 },
  );
  return mapping;
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
      const initDb = db(
        mergeOptions(
          defaultConfig,
          { mode, vars },
        ),
      );

      // ask the user which db to connect to / create / clone
      const { database, config } = await chooseDb(initDb)();

      // add in our database choice to the env vars we're writing
      env.database = database;
      env.url = initDb.combineUrl(env);

      createEnv(buildMap(vars, env));
      createConfig({ ...config, mode, vars });
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
    const vars = await promptForVars(
      existingEnv,
      mode === 'url' ? URL_PROMPTS : SPLIT_PROMPTS,
    );
    console.log();

    // bootstrap "db" with our mode / vars and the existing
    // environment (already injected into our process)
    const initDb = db(
      mergeOptions(
        defaultConfig,
        { mode, vars },
      ),
    );

    // figure out where the user wants to switch to and do it
    const { database, config } = await chooseDb(initDb)(initDb.thisDb());
    initDb.switchTo(database);

    createConfig({ ...config, mode, vars });
    console.log(`${c.underline('.pgshrc')} created!`);

    return process.exit(0);
  } catch (err) {
    console.error(
      `pgsh init failed: ${c.redBright(err.message)}`,
    );
    return process.exit(2);
  }
};

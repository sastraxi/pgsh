const c = require('ansi-colors');
const Bluebird = require('bluebird');
const { prompt } = require('enquirer');

const SKIP_HINT = c.dim(' (^C to skip)');

const capitalize = message =>
  message && message.charAt(0).toUpperCase() + message.slice(1);

/**
 * Iteratively ask for a number of inputs.
 * Allow skipping when marked skippable.
 *
 * @param {*} prompts the things we want to assign,
 *                    [{ name, description, skippable }, ...]
 * @returns a mapping from prompt names to the input they've given
 */
const promptForInput = async (prompts) => {
  const mapping = {};
  await Bluebird.mapSeries(
    prompts,
    async ({
      name,
      type,
      description,
      skippable,
      ...promptOptions
    }) => {
      try {
        const { selected } = await prompt({
          type: type || 'input',
          name: 'selected',
          message:
            `${c.bold(capitalize(description))}?`
              + `${(skippable ? SKIP_HINT : '')}`,
          ...promptOptions,
        });
        mapping[name] = selected;
      } catch (err) {
        console.log(err);
        if (!skippable) {
          throw new Error(`skipped non-skippable prompt "${name}"`);
        }
      }
    },
  );
  return mapping;
};

module.exports = promptForInput;

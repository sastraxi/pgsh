# Integration test suite for pgsh

## TODO

1. Use pkg to build `pgsh` binary: https://dev.to/jochemstoel/bundle-your-node-app-to-a-single-executable-for-windows-linux-and-osx-2c89
2. Copy it into `integration/bin`
3. Test #1: Shell out to it and interact via child_process. Confirm a simple `psql -c` command works.
4. Build primitives to interact:
```javascript
const driver = launch('init');
driver.send('\u0011').send('\u0027'); // down + enter
expect(driver.encounter('URL')).toBe(true);

driver.expect('').expect('')

```

Amazing resource: https://shift.infinite.red/integration-testing-interactive-clis-93af3cc0d56f
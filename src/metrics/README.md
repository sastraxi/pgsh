# What information does pgsh gather about me?

An example request that might be sent to the metrics server:

```json
[
  {
    "command": ["clone", "-f", "<a66b2f>", "<a7a4bc>"],
    "version": "0.10.5",
    "uname": "Darwin 18.7.0",
    "startedAt": 1574787094,
    "finishedAt": 1574787912,
    "exitCode": 0,
    "interactive": false,
    "cpus": [
      {
        "model": "Intel(R) Core(TM) i7 CPU         860  @ 2.80GHz",
        "speed": 2926,
        "times": {
          "user": 252020,
          "nice": 0,
          "sys": 30340,
          "idle": 1070356870,
          "irq": 0
        }
      },
      { ... },
      { ... },
      { ... }
    ]
  }
]
```

1. **Database names and filenames are obscured.** These are hashed alongside a "key" that is randomly re-generated.

2. **Your IP address is only used for rate limiting purposes.** It is never recorded anywhere, other than server logs on Heroku.

As a result, your data is quite anonymous. It is reasonable to assume that &mdash; given enough data about your actions &mdash; de-anonymization companies could use this information to help identify you. I believe the data being sent is the minimum required to gain useful insights from the way `pgsh` is used in practice.

> You can expect to send a few kilobytes of data each day. At most 2 megabytes of telemetry will be uploaded each hour.

## What will you use this information for?

* proactive bugfixing
* determine investments based on usage (aka. product)
* optimization
* blog posts and infographics (in aggregate)

## How do I opt in?

The first time you run `pgsh` after upgrading, you will be asked if you'd like to opt in. Afterwards, you can use the `pgsh metrics` command to toggle telemetry.

## How do I submit a claim under GDPR?

Please send any data requests or inquiries to sastraxi@gmail.com.

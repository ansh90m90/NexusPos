# CI for Nexus

Here are some instructions for setting up CI for Nexus.

## Prerequisites
- [GitHub Actions](https://github.com/features/actions) or [CircleCI](https://circleci.com/) or [Travis CI](https://travis-ci.org/)

## CI Configuration
1. **GitHub Actions**:
   - Create a `.github/workflows/ci.yml` file.
   - Add the following configuration:
     ```yaml
     name: CI

     on:
       push:
         branches: [ main ]
       pull_request:
         branches: [ main ]

     jobs:
       build:
         runs-on: ubuntu-latest

         steps:
         - uses: actions/checkout@v2
         - name: Use Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '16'
         - run: npm install
         - run: npm run build
         - run: npm run lint
         - run: npm run test
     ```

2. **CircleCI**:
   - Create a `.circleci/config.yml` file.
   - Add the following configuration:
     ```yaml
     version: 2.1

     jobs:
       build:
         docker:
           - image: circleci/node:16
         steps:
           - checkout
           - run: npm install
           - run: npm run build
           - run: npm run lint
           - run: npm run test

     workflows:
       version: 2
       build:
         jobs:
           - build
     ```

---

*For more information, please check the [README.md](README.md).*

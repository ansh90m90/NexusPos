# CD for Nexus

Here are some instructions for setting up CD for Nexus.

## Prerequisites
- [GitHub Actions](https://github.com/features/actions) or [CircleCI](https://circleci.com/) or [Travis CI](https://travis-ci.org/)

## CD Configuration
1. **GitHub Actions**:
   - Create a `.github/workflows/cd.yml` file.
   - Add the following configuration:
     ```yaml
     name: CD

     on:
       push:
         branches: [ main ]

     jobs:
       deploy:
         runs-on: ubuntu-latest

         steps:
         - uses: actions/checkout@v2
         - name: Use Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '16'
         - run: npm install
         - run: npm run build
         - run: npm run deploy
     ```

2. **CircleCI**:
   - Create a `.circleci/config.yml` file.
   - Add the following configuration:
     ```yaml
     version: 2.1

     jobs:
       deploy:
         docker:
           - image: circleci/node:16
         steps:
           - checkout
           - run: npm install
           - run: npm run build
           - run: npm run deploy

     workflows:
       version: 2
       deploy:
         jobs:
           - deploy
     ```

---

*For more information, please check the [README.md](README.md).*

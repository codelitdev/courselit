{
  "name": "courselit",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "author": {
    "name": "The CodeLit Team",
    "email": "hi@codelit.dev"
  },
  "homepage": "",
  "repository": {
    "type": "git",
    "url": "https://github.com/codelitdev/courselit"
  },
  "license": "MIT",
  "scripts": {
    "lint": "eslint packages apps/docs apps/web/pages apps/web/components",
    "prettier": "prettier --write packages apps docs *.md",
    "build": "yarn workspaces foreach -t --exclude @courselit/docs run build",
    "clean": "yarn workspaces foreach run clean",
    "publish": "yarn workspaces foreach --no-private npm publish",
    "dev": "yarn workspace @courselit/web dev",
    "prepare": "husky",
    "release:patch": "./release.sh patch",
    "release:minor": "./release.sh minor",
    "test": "NODE_OPTIONS='--experimental-vm-modules' SUPPRESS_JEST_WARNINGS=1 jest",
    "test:watch": "NODE_OPTIONS='--experimental-vm-modules' SUPPRESS_JEST_WARNINGS=1 jest --watch",
    "test:coverage": "NODE_OPTIONS='--experimental-vm-modules' SUPPRESS_JEST_WARNINGS=1 jest --coverage"
  },
  "packageManager": "yarn@3.2.0",
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/jest": "^29.5.14",
    "eslint": "^8.14.0",
    "eslint-config-prettier": "^8.5.0",
    "eslint-plugin-import": "^2.26.0",
    "eslint-plugin-react": "^7.34.1",
    "eslint-plugin-react-hooks": "^4.5.0",
    "eslint-plugin-unused-imports": "^2.0.0",
    "husky": "^9.0.11",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "lint-staged": "^15.2.2",
    "mongodb-memory-server": "^10.1.4",
    "prettier": "^3.0.2",
    "ts-node": "^10.9.2"
  },
  "engines": {
    "yarn": "~3.2.0"
  },
  "engineStrict": true,
  "lint-staged": {
    "*.{ts,tsx,js,css,md}": "prettier --write packages apps docs *.md",
    "*.{ts,tsx}": "eslint --quiet --cache --fix packages apps/docs apps/web/pages apps/web/components apps/web/auth.config.ts apps/web/auth.ts"
  },
  "resolutions": {
    "prosemirror-model": "^1.22.3",
    "prosemirror-view": "^1.34.2"
  }
}

const config = {
    testTimeout: 100000,
    moduleNameMapper: {
        '^axios$': 'axios/dist/node/axios.cjs',
        '^../../common/helpers/solanaHelper$': '<rootDir>/test/__mocks__/solanaHelper.ts',

    },

    globals: {
        'ts-jest': {
            isolatedModules: true,
        },
    },
    setupFiles: ['./jest.setup.js'],
};

module.exports = config;

const config = {
    testTimeout: 100000,
    moduleNameMapper: {
        '^axios$': 'axios/dist/axios.js',
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

var path = require('path');

var absoluteBasePath = path.resolve(__dirname);

/* global process */

// configures browsers to run test against
// any of [ 'ChromeHeadless', 'Chrome', 'Firefox' ]
//
// Chrome is the installed Google Chrome (or Chromium) that karma-chrome-launcher
// finds on the system; set CHROME_BIN to use a different binary.
var browsers =
  (process.env.TEST_BROWSERS || 'ChromeHeadless')
    .replace(/^\s+|\s+$/, '')
    .split(/\s*,\s*/g)
    .map(function(browser) {

      // run without sandbox on Linux (CI containers)
      if (browser === 'ChromeHeadless' && process.platform === 'linux') {
        return 'ChromeHeadless_Linux';
      }

      return browser;
    });


module.exports = function(karma) {
  karma.set({

    // load the plugins from this package: in a workspace, karma itself may
    // be installed next to other versions of them
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-mocha'),
      require('karma-sinon-chai'),
      require('karma-spec-reporter'),
      require('karma-webpack')
    ],

    frameworks: [
      'webpack',
      'mocha',
      'sinon-chai'
    ],

    files: [
      'test/suite.js'
    ],

    preprocessors: {
      'test/suite.js': [ 'webpack' ]
    },

    reporters: [ 'spec' ],

    browsers: browsers,

    customLaunchers: {
      ChromeHeadless_Linux: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ],
        debug: true
      }
    },

    client: {
      mocha: {
        timeout: 10000
      }
    },

    browserNoActivityTimeout: 30000,

    singleRun: true,
    autoWatch: false,

    webpack: {
      mode: 'development',
      devtool: 'eval-source-map',
      target: 'web',
      module: {
        rules: [
          {
            test: /\.(css|cmmn)$/,
            type: 'asset/source'
          }
        ]
      },
      resolve: {
        modules: [
          'node_modules',
          absoluteBasePath
        ]
      }
    }
  });
};

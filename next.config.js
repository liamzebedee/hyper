const withTranspile = require('next-transpile-modules')(['react-konva', 'konva']); // pass the modules you would like to see transpiled

const config = {
  reactStrictMode: true,
  experimental: { 
    esmExternals: 'loose'
  }
}

const compose = (x, fns) => fns.reduce((acc, curr) => curr(acc), x)

module.exports = compose(config, [])
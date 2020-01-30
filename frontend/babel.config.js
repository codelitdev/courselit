module.exports = {
  presets: ['next/babel', '@babel/preset-env', '@babel/preset-react'],
  plugins: [
    ['@babel/plugin-transform-runtime', {regenerator: true}]
  ]
}

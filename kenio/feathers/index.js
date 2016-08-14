if(!global._babelPolyfill) { require('babel-polyfill'); }

import express from 'express';
import feathers from './feathers';

export default function createApplication(... args) {
  return feathers(express(... args));
}

// Expose all express methods (like express.engine())
Object.assign(createApplication, express, {

});

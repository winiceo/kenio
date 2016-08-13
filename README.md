> Such merge, very design, so structure... wow!

# Locomotive-Drywall Seed
[Drywall](http://jedireza.github.io/drywall/) repackaged into a [Locomotive](http://locomotivejs.org/) app.

An attempt to merge the MVC architecture and advanced routing of [Locomotive](http://locomotivejs.org/) with the ready-to-use UI and user management of [Drywall](http://jedireza.github.io/drywall/).

# Installation

1. `$ git clone https://github.com/adityamukho/locomotive-drywall-seed.git`
1. Copy `config/config.example.js` to `config/config.js` and edit to your liking.
1. `$ npm install`
1. Build the minified resources inside the `public` folder:
	`$ grunt build`
1. Run the server:
	1. Development:
		`$ grunt`
	1. Production: `$ export NODE_ENV='production'` and
		`$ npm start`
		or
		`$ node ./server.js`
		or
		`lcm server [port]`
1. Follow the db setup instructions at https://github.com/jedireza/drywall#setup

Check the [Locomotive](http://locomotivejs.org/) docs at http://locomotivejs.org/guide/.

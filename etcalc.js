if (typeof(Mandelbrot) === 'undefined') {
	Mandelbrot = {};
}

Mandelbrot.EscapeTimeCalculator = function(name, equation, iterFunc) {
	this.name = name;
	this.equation = equation;
	this.iterate = iterFunc;
};

$.extend(Mandelbrot.EscapeTimeCalculator.prototype, {
	getName: function() {
		return this.name;
	},
	getEquation: function(isJulia) {
		return 'z<sub>n+1</sub> = ' + this.equation + ' + ' + (isJulia ? 'C' : 'z<sub>0</sub>');
	},
	getIterFunc: function() {
		return this.iterate;
	}
});

$.extend(Mandelbrot, {
	/**
	 * Calculate number of iterations of Mandelbrot function (ie terms in
	 * sequence) before given point z = (x(1) + y(1)i) escapes circle of given
	 * radius. For the Mandelbrot set relation, any point that escapes a circle
	 * of radius 2 increases to infinity and therefore is not in the set. If we
	 * reach n iterations, give up and return n.
	 * TODO: The below calculations might be more efficient in polar co-ords.
	 */
	escapeTimeCalculators: [
	    /**
	     * Classical Mandelbrot (quadratic).
	     * First term of orbit series = z(0) = x(0) + y(0)i ;
	     * then z(1) = z(0)^2 + z(0) = (x(0) + y(0)i)^2 + x(0) + y(0)i ;
	     * generally, z(n+1) = z(n)^2 + z(0) = z(n)^2 + x(0) + y(0)i .
	     * Solving separately for the real and imaginary components:
	     * x(n+1) = x(n)^2 - y(n)^2 + x(0), and
	     * y(n+1) = 2x(n)y(n) + y(0)
	     * TODO: detect underflow and use bignum library for greater precision?
	     */
	    new Mandelbrot.EscapeTimeCalculator(
	    	'mandelbrot',
	    	'z<sub>n</sub><sup>2</sup>',
	    	function(isJulia, x, y, crl, cim, maxIter, radius, normalised) {
	    		var rl = x, im = y, sqrl = 0, sqim = im * im, i = 0, sqr = radius * radius, q;
	    		if (!isJulia) {
		    		// Optimisation: is this point inside the main point-attractor cardioid?
		    		q = (x - 0.25) * (x - 0.25) + sqim;
		    		if (q * (q + x - 0.25) < sqim / 4) {
		    			return [maxIter, 0, 2]; // Inside the cardioid
		    		}
		    		// Optimisation: is this point inside the period 2 bulb to the left of the cardioid?
		    		if ((x + 1) * (x + 1) + sqim < 0.0625) {
		    			return [maxIter, 0, 2]; // Inside period 2 bulb
		    		}
	    		}

	    		for (;;) {
	    			sqrl = rl * rl;
	    			if (sqrl + sqim > sqr) {
	    				break;
	    			}
	    			im = (2 * rl * im) + cim;
	    			rl = sqrl - sqim + crl;
	    			if (++i >= maxIter) {
	    				return [maxIter, 0, 2];
	    			}
	    			sqim = im * im;
	    		}

	    		if (normalised) {
	        		return [i, Math.sqrt(sqrl + sqim), 2];    			
	    		}
	    		return [i, 0, 2];
	    	}
	    ),
	    /**
	     * Mandelbrot cubic: z(n+1) = z(n)^3 + z(0)
	     * R(n+1) = R(n)(R(n)^2 - 3I(n)^2) + R(0)
	     * and
	     * I(n+1) = I(n)((3R(n)^2 - I(n)^2) + I(0))
	     */
	    new Mandelbrot.EscapeTimeCalculator(
	    	'mandelbrot cubic',
	    	'z<sub>n</sub><sup>3</sup>',
	    	function(isJulia, x, y, crl, cim, maxIter, radius, normalised) {
	    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius, newrl;

	    		for (;;) {
	    			sqrl = rl * rl;
	    			sqim = im * im;
	    			if (sqrl + sqim > sqr) {
	    				break;
	    			}
	    			newrl = rl * (sqrl - 3 * sqim) + crl;
	    			im = im * (3 * sqrl - sqim) + cim;
	    			rl = newrl;
	    			if (++i >= maxIter) {
	    				return [maxIter, 0, 3];
	    			}
	    		}

	    		if (normalised) {
	    			return [i, Math.sqrt(sqrl + sqim), 3];
	    		}
	    		return [i, 0, 3];
	    	}
	    ),
	    /**
	     * Mandelbrot quartic: z(n+1) = z(n)^4 + z(0)
	     * (a+bi)^4 = 1a^4 + 4a^3(bi) + 6a^2(bi)^2 + 4a(bi)^3 + 1(bi)^4
	     *          = a^4  + 4a^3bi   - 6a^2b^2    - 4ab^3i   + b^4
	     *          = a^4 + b^4 - 6a^2b^2 + (4a^3b - 4ab^3)i
	     * R(n+1)   = a^4 + b^4 - 6a^2b^2 + R(0)
	     * I(n+1)   = 4a^3b - 4ab^3 + I(0)
	     */
	    new Mandelbrot.EscapeTimeCalculator(
		    'mandelbrot quartic',
		    'z<sub>n</sub><sup>4</sup>',
		    function(isJulia, x, y, crl, cim, maxIter, radius, normalised) {
		    	var rl = x, im = y, sqrl = 0, sqim = 0, newrl, i = 0, sqr = radius * radius;

	    		for (;;) {
	    			sqrl = rl * rl;
	    			sqim = im * im;
	    			if (sqrl + sqim > sqr) {
	    				break;
	    			}
	    			newrl = sqrl * sqrl + sqim * sqim - 6 * sqrl * sqim + crl;
	    			im = 4 * sqrl * rl * im - 4 * rl * sqim * im + cim;
	    			rl = newrl;
	    			if (++i >= maxIter) {
	    				return [maxIter, 0, 4];
	    			}
	    		}
	    		if (normalised) {
	        		return [i, Math.sqrt(sqrl + sqim), 4];
	    		}
	    		return [i, 0, 4];
	    	}
	    ),
	    /**
	     * Mandelbrot quintic: z(n+1) = z(n)^5 + z(0)
	     */
		new Mandelbrot.EscapeTimeCalculator(
			'mandelbrot quintic',
			'z<sub>n</sub><sup>5</sup>',
			function(isJulia, x, y, crl, cim, maxIter, radius, normalised) {
	    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

	    		for (;;) {
	    			sqrl = rl * rl;
	    			sqim = im * im;
	    			if ((sqrl + sqim) > sqr) {
	    				break;
	    			}
	    			rl = (rl * ((sqrl * (sqrl - sqim)) - (9 * sqrl * sqim) + (5 * sqim * sqim))) + crl;
	    			im = (im * ((sqim * (sqim - (10 * sqrl))) + (5 * sqrl * sqrl))) + cim;
	    			if (++i >= maxIter) {
	    				return [maxIter, 0, 5];
	    			}
	    		}

	    		if (normalised) {
	        		return [i, Math.sqrt(sqrl + sqim), 5];
	    		}
	    		return [i, 0, 5];
			}
		),
		/**
		 * Mandelbrot conjugate aka Mandelbar aka Tricorn: z(n+1) = con(z)^2 + z(0)
		 */
		new Mandelbrot.EscapeTimeCalculator(
			'mandelbrot conjugate',
			'z&#x0305;<sub>n</sub><sup>2</sup>',
			function(isJulia, x, y, crl, cim, maxIter, radius, normalised) {
	    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

	    		for (;;) {
	    			sqrl = rl * rl;
	    			sqim = im * im;
	    			if (sqrl + sqim > sqr) {
	    				break;
	    			}
	    			im = (-2 * rl * im) + cim;
	    			rl = sqrl - sqim + crl;
	    			if (++i >= maxIter) {
	    				return [maxIter, 0, 2];
	    			}
	    		}

	    		if (normalised) {
	        		return [i, Math.sqrt(sqrl + sqim), 2];
	    		}
	    		return [i, 0, 2];
			}
		),
		/**
		 * Mandelbrot conjugate cubic: z(n+1) = con(z)^3 + z(0)
		 */
		new Mandelbrot.EscapeTimeCalculator(
			'mandelbrot conjugate cubic',
			'z&#x0305;<sub>n</sub><sup>3</sup>',
			function(isJulia, x, y, crl, cim, maxIter, radius, normalised) {
	    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

	    		for (;;) {
	    			sqrl = rl * rl;
	    			sqim = im * im;
	    			if (sqrl + sqim > sqr) {
	    				break;
	    			}
	    			rl = rl * (sqrl - (3 * sqim)) + crl;
	    			im = im * (sqim - (3 * sqrl)) + cim;
	    			if (++i >= maxIter) {
	    				return [maxIter, 0, 3];
	    			}
	    		}

	    		if (normalised) {
	        		return [i, Math.sqrt(sqrl + sqim), 3];
	    		}
	    		return [i, 0, 3];
			}
		),
		/**
		 * Mandelbrot conjugate quartic: z(n+1) = con(z)^4 + z(0)
		 */
		new Mandelbrot.EscapeTimeCalculator(
			'mandelbrot conjugate quartic',
			'z&#x0305;<sub>n</sub><sup>4</sup>',
			function(isJulia, x, y, crl, cim, maxIter, radius, normalised) {
	    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

	    		for (;;) {
	    			sqrl = rl * rl;
	    			sqim = im * im;
	    			if (sqrl + sqim > sqr) {
	    				break;
	    			}
	    			rlim = rl * im;
	    			diffsq = sqrl - sqim;
	    			im = cim - (4 * rlim * diffsq);
	    			rl = (diffsq * diffsq) - (4 * rlim * rlim) + crl;
	    			if (++i >= maxIter) {
	    				return [maxIter, 0, 4];
	    			}
	    		}

	    		if (normalised) {
	        		return [i, Math.sqrt(sqrl + sqim), 4];
	    		}
	    		return [i, 0, 4];
			}
		),
		/**
		 * Mandelbrot conjugate quintic: z(n+1) = con(z)^5 + z(0)
		 */
		new Mandelbrot.EscapeTimeCalculator(
			'mandelbrot conjugate quintic',
			'z&#x0305;<sub>n</sub><sup>5</sup>',
			function(isJulia, x, y, crl, cim, maxIter, radius, normalised) {
	    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

	    		for (;;) {
	    			sqrl = rl * rl;
	    			sqim = im * im;
	    			if ((sqrl + sqim) > sqr) {
	    				break;
	    			}
	    			rl = (rl * ((sqrl * (sqrl - sqim)) + (sqim * ((5 * sqim) - (9 * sqrl))))) + crl;
	    			im = (im * ((sqim * (sqrl - sqim)) + (sqrl * ((9 * sqim) - (5 * sqrl))))) + cim;
	    			if (++i >= maxIter) {
	    				return [maxIter, 0, 5];
	    			}
	    		}

	    		if (normalised) {
	        		return [i, Math.sqrt(sqrl + sqim), 5];
	    		}
	    		return [i, 0, 5];
			}
		)
	]
});

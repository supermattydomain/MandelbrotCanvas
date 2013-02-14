/**
 * The Mandelbrot set using Javascript and a canvas for image pixel access.
 */

/**
 * Set a pixel's rgba values in a canvas ImageData object.
 */
function setPixel(imageData, x, y, r, g, b, a) {
	var i = (y * imageData.width * 4) + (x * 4);
	imageData.data[i + 0] = r;
	imageData.data[i + 1] = g;
	imageData.data[i + 2] = b;
	imageData.data[i + 3] = a;
}

function toInitialCaps(str) {
	var ret = '';
	str.split(' ').forEach(function(word) {
		if (ret) {
			ret += ' ';
		}
		ret += word.charAt(0).toUpperCase() + word.substring(1);
	});
	return ret;
}

/**
 * Various ways of mapping escape-time values to a repeating range of colours.
 */
var colourMaps = {
    /**
     * A ramp through the rainbow in hue.
     */
    'rainbow': {
    	numGradations: 70,
    	colourMap: [],
    	genColourMap: function() {
    		var h = 0, s = 1, v = 1, i;
    		for (i = 0; i < this.numGradations; i++) {
    			var rgb = hsvToRgb(h + (i / this.numGradations), s, v);
    			this.colourMap[i] = [ rgb[0], rgb[1], rgb[2], 255 ];
    		}
    	},
    	makeColour: function(n, maxIter) {
    		// points in set are black
    		if (n == maxIter) {
    			return [0, 0, 0, 255];
    		}
    		// outside set, iteration count modulo entire colourmap size selects colour
    		return this.colourMap[n % this.colourMap.length];
    	}
    },
    /**
     * A 'smooth' ramp from red to green to blue.
     */
   	'smooth': {
    	numGradations: 40,
    	colourMap: [],
    	makeColour: function(n, maxIter) {
    		// points in set are black
    		if (n == maxIter) {
    			return [0, 0, 0, 255];
    		}
    		// outside set, iteration count modulo entire colourmap size selects colour
    		return this.colourMap[n % this.colourMap.length];
    	},
    	genColourMap: function() {
    		var i, n;
    		for (i = 0; i < this.numGradations * 3; i++) {
    			n = 255 * i / this.numGradations; // amount into transition into next colour
    			// from red at 0 to green at 1/3
    			this.colourMap[i] = [
    			    255 - n, // red monotonic decrease
    				n, // green monotonic increase
    				0, // blue constant
    				255 // alpha constant
    			];
    			// from green at 1/3 to blue at 2/3
    			this.colourMap[i + this.numGradations] = [
    				0, // red constant
    				255 - n, // green monotonic decrease
    				n, // blue monotonic increase
    				255 // alpha constant
    			];
    			// from blue at 2/3 to red at 3/3==0
    			this.colourMap[i + this.numGradations + this.numGradations] = [
    			    n, // red monotonic increase
    				0, // green constant
    				255 - n, // blue monotonic decrease
    				255 // alpha constant
    			];
    		}
    	}
    }
};

/*
Pascal's triangle, for calculating binomial coefficients
for expansion of (a + b)^n below.
   1
  1 1
 1 2 1
1 3 3 1
1 4 6 4 1
*/

/**
 * Calculate number of iterations of Mandelbrot function (ie terms in
 * sequence) before given point z = (x(1) + y(1)i) escapes circle of given
 * radius. For the Mandelbrot set relation, any point that escapes a circle
 * of radius 2 increases to infinity and therefore is not in the set. If we
 * reach n iterations, give up and return n.
 */
var escapeTimeCalculators = {
    /**
     * Classical Mandelbrot (quadratic).
     * First term of orbit series =
     * z(0) = x(0) + y(0)i; then z(1) = z(0)^2 + z(0) = (x(0) + y(0)i)^2 + x(0) +
     * y(0)i; generally, z(n+1) = z(n)^2 + z(1) = z(n)^2 + x(1) + y(1)i Solving
     * separately for the real and imaginary components: x(n+1) = x(n)^2 -
     * y(n)^2 + x(1), and y(n+1) = 2x(n)y(n) + y(1)
     * TODO: detect underflow and use bignum library for greater precision?
     */
	'mandelbrot': {
    	escapeTime: function(x, y, maxIter) {
    		var rl, im, sqrl, sqim, i, sqr = 2 * 2;

    		for (i = 0, rl = x, im = y; i < maxIter; i++) {
    			sqrl = rl * rl;
    			sqim = im * im;
    			if (sqrl + sqim > sqr) {
    				break;
    			}
    			im = (2 * rl * im) + y;
    			rl = sqrl - sqim + x;
    		} // for iterations

    		return i;
    	}
    },
    /**
     * Mandelbrot cubic: z(n+1) = z(n)^3 + z(0)
     * R(n+1) = R(n)(R(n)^2 - 3I(n)^2) +R(0)
     * and
     * I(n+1) = I(n)((3R(n)^2 - I(n)^2) + I(0))
     */
    'mandelbrot cubic': {
    	escapeTime: function(x, y, maxIter) {
    		var rl, im, sqrl, sqim, i, sqr = 2 * 2;

    		for (i = 0, rl = x, im = y; i < maxIter; i++) {
    			sqrl = rl * rl;
    			sqim = im * im;
    			if (sqrl + sqim > sqr) {
    				break;
    			}
    			var newrl = rl * (sqrl - 3 * sqim) + x;
    			im = im * (3 * sqrl - sqim) + y;
    			rl = newrl;
    		} // for iterations

    		return i;
    	}
    },
    /**
     * Mandelbrot quartic: z(n+1) = z(n)^4 + z(0)
     * (a+bi)^4 = 1a^4 + 4a^3(bi) + 6a^2(bi)^2 + 4a(bi)^3 + 1(bi)^4
     *          = a^4  + 4a^3bi   - 6a^2b^2    - 4ab^3i   + b^4
     *          = a^4 + b^4 - 6a^2b^2 + (4a^3b - 4ab^3)i
     * R(n+1)   = a^4 + b^4 - 6a^2b^2 + R(0)
     * I(n+1)   = 4a^3b - 4ab^3 + I(0)
     */
    'mandelbrot quartic': {
    	escapeTime: function(x, y, maxIter) {
    		var rl, im, sqrl, sqim, newrl, i, sqr = 2 * 2;

    		for (i = 0, rl = x, im = y; i < maxIter; i++) {
    			sqrl = rl * rl;
    			sqim = im * im;
    			if (sqrl + sqim > sqr) {
    				break;
    			}
    			newrl = sqrl * sqrl + sqim * sqim - 6 * sqrl * sqim + x;
    			im = 4 * sqrl * rl * im - 4 * rl * sqim * im + y;
    			rl = newrl;
    		} // for iterations

    		return i;
    	}
    }
};

/**
 * A panel displaying the Mandelbrot set.
 * @param canvas A jQuery wrapper around the HTML5 canvas element to draw into
 * @param cmap Name of the colourmap to use
 * @param etCalcName Name of the escape-time calculator to use
 * @returns
 */
function Mandelbrot(canvas, cmapName, etCalcName) {
	this.etCalcName = etCalcName;
	if (this.etCalcName.toLowerCase() in escapeTimeCalculators) {
		this.calc = escapeTimeCalculators[this.etCalcName.toLowerCase()];
	} else {
		debug('Unknown escape time calculator name "' + this.etCalcName + "'");
		return;
	}
	this.cmapName = cmapName;
	if (this.cmapName.toLowerCase() in colourMaps) {
		this.cmap = colourMaps[this.cmapName.toLowerCase()];
	} else {
		debug('Unknown colour map name "' + this.cmapName + "'");
		return;
	}
	this.canvas = canvas;
	this.context = this.canvas[0].getContext("2d");
	this.imageData = this.context.getImageData(0, 0, this.canvas.width(), this.canvas.height());
	this.centreRl = 0;
	this.centreIm = 0;
	this.scale = 5 / Math.min(this.imageData.width, this.imageData.height);
	this.maxIter = 100;
	this.colToX = function(c) {
		return  (c - this.imageData.width  / 2) * this.scale + this.centreRl;
	};
	this.rowToY = function(r) {
		// Inversion due to the canvas' inverted-Y co-ordinate system.
		// The set is symmetrical, but the co-ordinates are shown to the user.
		return -(r - this.imageData.height / 2) * this.scale + this.centreIm;
	};
	this.update = function() {
		this.stop();
		function updateFunc(myUpdateTimeout) {
			this.imageData = this.context.getImageData(0, 0, this.canvas.width(), this.canvas.height());
			var r, c, x, y, et, colour;
			for (r = 0; r < this.imageData.height; r++) {
				for (c = 0; c < this.imageData.width; c++) {
					x = this.colToX(c);
					y = this.rowToY(r);
					et = this.calc.escapeTime.call(this.calc, x, y, this.maxIter);
					colour = this.cmap.makeColour.call(this.cmap, et, this.maxIter);
					if (this.updateTimeout != myUpdateTimeout) {
						return; // Abort - no longer the current render thread
					} 
					setPixel(this.imageData, c, r, colour[0], colour[1], colour[2], colour[3]);
					// drawHLine(this.imageData, 0, i, this.imageData.width - 1, colour[0], colour[1], colour[2], colour[3]);
				}
			}
			this.context.putImageData(this.imageData, 0, 0);
		}
		var that = this;
		this.updateTimeout = setTimeout(function() {
			updateFunc.call(that, that.updateTimeout);
		});
	};
	this.stop = function() {
		clearTimeout(this.updateTimeout);
		this.updateTimeout = null;
	};
	this.getCentre = function() {
		return [ this.centreRl, this.centreIm ];
	};
	this.setCentre = function(rl, im) {
		this.centreRl = rl;
		this.centreIm = im;
	};
	this.getScale = function() {
		return this.scale;
	};
	this.setScale = function(newScale) {
		this.scale = newScale;
		return this.scale;
	};
	this.zoomBy = function(factor) {
		this.scale *= factor;
		return this.scale;
	};
	this.zoomInBy = function(factor) {
		return this.zoomBy(1 / factor);
	};
	this.zoomOutBy = this.zoomBy;
	this.getMaxIter = function() {
		return this.maxIter;
	};
	this.setMaxIter = function(newMaxIter) {
		this.maxIter = newMaxIter;
	};
	this.getColourMapName = function() {
		return this.cmapName;
	};
	this.setColourMapName = function(newCmapName) {
		if (!(newCmapName.toLowerCase() in colourMaps)) {
			debug('Unknown colour map name "' + newCmapName + "'");
			return;
		}
		this.cmapName = newCmapName;
		this.cmap = colourMaps[newCmapName.toLowerCase()];
	};
	this.getFractalType = function() {
		return this.etCalcName;
	};
	this.setFractalType = function(newCalcName) {
		if (!(newCalcName.toLowerCase() in escapeTimeCalculators)) {
			debug('Unknown escape time calculator name "' + newCalcName + "'");
			return;
		}
		this.etCalcName = newCalcName;
		this.calc = escapeTimeCalculators[newCalcName.toLowerCase()];
	};
}

$(function() {
	var canvas = $('#mandelbrot');
	var displayMouseRl = $('#mouserl');
	var displayMouseIm = $('#mouseim');
	var displayCentreRl = $('#centrerl');
	var displayCentreIm = $('#centreim');
	var displayScale = $('#scale');
	var displayMaxIter = $('#maxiter');
	var displayColourMap = $('#colourmap');
	var displayFractalType = $('#fractaltype');
	for (cmapName in colourMaps) {
		// Generate this colourmap's table of colours
		colourMaps[cmapName].genColourMap();
		// Generate an entry in the drop-down select list for this colour map
		var option = $(document.createElement('option'));
		option.text(toInitialCaps(cmapName));
		displayColourMap.append(option);
	}
	for (etCalcName in escapeTimeCalculators) {
		// Generate an entry in the drop-down select list for this fractal type
		var option = $(document.createElement('option'));
		option.text(toInitialCaps(etCalcName));
		displayFractalType.append(option);
	}
	var mandelbrot = new Mandelbrot(canvas, displayColourMap.val(), displayFractalType.val());
	function updateControls() {
		displayCentreRl.val(mandelbrot.getCentre()[0]);
		displayCentreIm.val(mandelbrot.getCentre()[1]);
		displayScale.val(mandelbrot.getScale());
		displayColourMap.val(mandelbrot.getColourMapName());
		displayMaxIter.val(mandelbrot.getMaxIter());
		displayFractalType.val(mandelbrot.getFractalType());
	}
	function update() {
		updateControls();
		mandelbrot.update();
	}
	canvas.on('mousemove', function(event) {
		displayMouseRl.val(mandelbrot.colToX(event.pageX - canvas.position().left));
		displayMouseIm.val(mandelbrot.rowToY(event.pageY - canvas.position().top));
	}).on('click', function(event) {
		mandelbrot.setCentre(mandelbrot.colToX(event.pageX - canvas.position().left), mandelbrot.rowToY(event.pageY - canvas.position().top));
		mandelbrot.zoomInBy(2);
		update();
	});
	displayCentreRl.on('change', function() {
		mandelbrot.setCentre(parseFloat($(this).val()), mandelbrot.getCentre()[1]);
		update();
	});
	displayCentreIm.on('change', function() {
		mandelbrot.setCentre(mandelbrot.getCentre()[0], parseFloat($(this).val()));
		update();
	});
	displayScale.on('change', function() {
		mandelbrot.setScale(parseFloat($(this).val()));
		update();
	});
	displayMaxIter.on('change', function() {
		mandelbrot.setMaxIter(parseInt($(this).val(), 10));
		update();
	});
	displayColourMap.change(function() {
		mandelbrot.setColourMapName($(this).val());
		update();
	});
	displayFractalType.change(function() {
		mandelbrot.setFractalType($(this).val());
		update();
	});
	$('#zoomin').on('click', function() {
		mandelbrot.zoomInBy(2);
		update();
	});
	$('#zoomout').on('click', function() {
		mandelbrot.zoomOutBy(2);
		update();
	});
	update();
});

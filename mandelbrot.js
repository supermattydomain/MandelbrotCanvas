/**
 * The Mandelbrot set using Javascript and a canvas for image pixel access.
 */

function drawHLine(imageData, x1, y, x2, r, g, b, a) {
	var i = (y*imageData.width*4);
	for (; x1 <= x2; x1++) {
		imageData.data[i + (x1*4) + 0] = r;
		imageData.data[i + (x1*4) + 1] = g;
		imageData.data[i + (x1*4) + 2] = b;
		imageData.data[i + (x1*4) + 3] = a;
	}
}

function setPixel(imageData, x, y, r, g, b, a) {
	var i = (y*imageData.width*4) + (x*4);
	imageData.data[i + 0] = r;
	imageData.data[i + 1] = g;
	imageData.data[i + 2] = b;
	imageData.data[i + 3] = a;
}

function ColourMapRainbow() {
	// TODO: This needs to be smarter. Maybe logarithmic.
	this.numGradations = 70;
	this.colourMap = [];
	this.genColourMap = function() {
		var h = 0, s = 1, v = 1, i;
		for (i = 0; i < this.numGradations; i++) {
			var rgb = hsvToRgb(h + (i / this.numGradations), s, v);
			this.colourMap[i] = [ rgb[0], rgb[1], rgb[2], 255 ];
		}
	};
	this.makeColour = function(n, maxIter) {
		// points in set are black
		if (n == maxIter) {
			return [0, 0, 0, 255];
		}
		// outside set, iteration count modulo entire colourmap size selects colour
		return this.colourMap[n % this.colourMap.length];
	};
	this.genColourMap();
}

/**
 * Calculate number of iterations of Mandelbrot function (ie terms in
 * sequence) before given point z = (x(1) + y(1)i) escapes circle of given
 * radius. For the Mandelbrot set relation, any point that escapes a circle
 * of radius 2 increases to infinity and therefore is not in the set. If we
 * reach n iterations, give up and return n. First term of orbit series =
 * z(1) = x(1) + y(1)i; then z(2) = z(1)^2 + z(1) = (x(1) + y(1)i)^2 + x(1) +
 * y(1)i; generally, z(n+1) = z(n)^2 + z(1) = z(n)^2 + x(1) + y(1)i Solving
 * seperately for the real and imaginary components: x(n+1) = x(n)^2 -
 * y(n)^2 + x(1), and y(n+1) = 2x(n)y(n) + y(1) TODO: detect consistently
 * decreasing terms and bailout early? TODO: detect underflow and somehow
 * get greater precision? avoid arbitrary-precision math lib as long as
 * possible...
 */
function EscapeTimeCalculator() {
	this.radius = 2;
	this.escapeTime = function(x, y, maxIter) {
		var rl, im, sqrl, sqim;
		var sqr = this.radius * this.radius;
		var i;

		// debug("Radius: " + radius.getValueDouble());
		// debug("MaxIter: " + maxIter.getValueInt());
		// debug("X0: " + x);
		// debug("Y0: " + y);

		for (i = 0, rl = x, im = y; i < maxIter; i++) {
			sqrl = rl * rl;
			sqim = im * im;
			if (sqrl + sqim > sqr) {
				break;
			}
			im = (2 * rl * im) + y;
			rl = sqrl - sqim + x;
		} // for iterations

		// debug("(" + x + ", " + y + "): " + i);

		return i;
	};
}

function Mandelbrot(canvas, cmap, calc) {
	this.canvas = canvas;
	this.cmap = new ColourMapRainbow();
	this.calc = new EscapeTimeCalculator();
	this.context = this.canvas[0].getContext("2d");
	this.imageData = this.context.getImageData(0, 0, this.canvas.width(), this.canvas.height());
	this.centreRl = 0;
	this.centreIm = 0;
	this.scale = 5 / Math.min(this.imageData.width, this.imageData.height);
	this.maxIter = 100;
	this.colToX = function(c) {
		return (this.centreRl + c - this.imageData.width  / 2) * this.scale;
	};
	this.rowToY = function(r) {
		return (this.centreIm + r - this.imageData.height / 2) * this.scale;
	};
	this.update = function() {
		var r, c, x, y, et, colour;
		for (r = 0; r < this.imageData.height; r++) {
			for (c = 0; c < this.imageData.width; c++) {
				x = this.colToX(c);
				y = this.rowToY(r);
				et = this.calc.escapeTime(x, y, this.maxIter);
				// debug(x, y, et);
				colour = this.cmap.makeColour(et, this.maxIter);
				setPixel(this.imageData, c, r, colour[0], colour[1], colour[2], colour[3]);
				// drawHLine(this.imageData, 0, i, this.imageData.width - 1, colour[0], colour[1], colour[2], colour[3]);
			}
		}
		this.context.putImageData(this.imageData, 0, 0);
	};
}

$(function() {
	var mandelbrot = new Mandelbrot($('#mandelbrot'));
	mandelbrot.update();
});

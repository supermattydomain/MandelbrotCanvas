/**
 * The Mandelbrot set using Javascript and a canvas for image pixel access.
 */

function drawHLine(imageData, x1, y1, x2, r, g, b, a) {
	for (; x1 <= x2; x1++) {
		imageData.data[(y1*imageData.width*4) + (x1*4) + 0] = r;
		imageData.data[(y1*imageData.width*4) + (x1*4) + 1] = g;
		imageData.data[(y1*imageData.width*4) + (x1*4) + 2] = b;
		imageData.data[(y1*imageData.width*4) + (x1*4) + 3] = a;
	}
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

$(function() {
	var canvas = $('#mandelbrot');
	var context = canvas[0].getContext("2d");
	var imageData = context.getImageData(0, 0, canvas.width(), canvas.height());
	var cmap = new ColourMapRainbow();
	for (var i = 0; i < 200; i++) {
		var colour = cmap.makeColour(i, 1000);
		drawHLine(imageData, 0, i, imageData.width - 1, colour[0], colour[1], colour[2], colour[3]);
	}
	context.putImageData(imageData, 0, 0);
});

if (typeof(Mandelbrot) === 'undefined') {
	Mandelbrot = {};
}

/**
 * Abstract superclass of all colour maps.
 * @param name Name of colourmap
 * @returns {Mandelbrot.ColourMap} The new ColourMap instance
 */
Mandelbrot.ColourMap = function(name) {
	this.name = name;
	this.colourMap = [];
	if (this.genColourMap) {
		this.genColourMap();
	}
};
$.extend(Mandelbrot.ColourMap.prototype, {
	// FIXME: The below seems to result in this array being shared by all instances
	// of all subclasses, as if it were 'static' in C++.
	// But assigning in the parent class ctor (above) works.
	// What is the difference between the two?
	// colourMap: []
	makeColour: function(n, lastVal, power, maxIter, normalised) {
		// Points in the set are black
		if (n === maxIter) {
			return [0, 0, 0, 255];
		}
		// Lazily generate this colourmap's table of colours
		if (!this.colourMap.length) {
			this.genColourMap();
		}
		// Outside the set, iteration count modulo entire colourmap size selects colour
		if (normalised) {
			// Generate a fractional normalised iteration count
			n = Math.max(0, n + 1 - Math.log(Math.log(lastVal)) / Math.log(power));
		}
		// Increases in iteration count cause only logarithmic changes in colourmap entry
		n = Math.max(0, logBase(1.3, n));
		if (normalised) {
			// Use fractional iteration count to interpolate between colours
			return interpolateColour(
				this.colourMap[Math.floor(n) % this.colourMap.length],
				this.colourMap[(Math.floor(n) + 1) % this.colourMap.length],
				n - Math.floor(n)
			);
		}
		// Return an entry directly from the colour map
		return this.colourMap[Math.floor(n) % this.colourMap.length];
	}
});

/**
 * A ramp through the rainbow in hue.
 */
Mandelbrot.RainbowColourMap = function() {
	Mandelbrot.ColourMap.call(this, 'rainbow');
};
Mandelbrot.RainbowColourMap.prototype = new Mandelbrot.ColourMap();
$.extend(Mandelbrot.RainbowColourMap.prototype, {
	numGradations: 10, // Gradations per colour map
	genColourMap: function() {
		var h = 0, s = 0.6, v = 0.8, i, rgb;
		for (i = 0; i < this.numGradations; i++) {
			rgb = hsvToRgb(h + (i / this.numGradations), s, v);
			this.colourMap[i] = [ rgb[0], rgb[1], rgb[2], 255 ];
		}
	}
});

/**
 * A 'smooth' ramp from red to green to blue and back to red.
 */
Mandelbrot.RGBColourMap = function() {
	Mandelbrot.ColourMap.call(this, 'RGB');
};
Mandelbrot.RGBColourMap.prototype = new Mandelbrot.ColourMap();
$.extend(Mandelbrot.RGBColourMap.prototype, {
	numGradations: 5, // Gradations per colour transition; three transitions per colour map
	genColourMap: function() {
		var i, n, max = 128;
		for (i = 0; i < this.numGradations * 3; i++) {
			n = max * i / this.numGradations; // amount into transition into next colour
			// from red at 0 to green at 1/3
			this.colourMap[i] = [
			    max - n, // red monotonic decrease
				n,  // green monotonic increase
				0,  // blue constant
				255 // alpha constant
			];
			// from green at 1/3 to blue at 2/3
			this.colourMap[i + this.numGradations] = [
				0,  // red constant
				max - n, // green monotonic decrease
				n,  // blue monotonic increase
				255 // alpha constant
			];
			// from blue at 2/3 to red at 3/3==0
			this.colourMap[i + this.numGradations + this.numGradations] = [
			    n,  // red monotonic increase
				0,  // green constant
				max - n, // blue monotonic decrease
				255 // alpha constant
			];
		}
	}
});

$.extend(Mandelbrot, {
	/**
	 * Various ways of mapping escape-time values to a repeating range of colours.
	 */
	colourMaps: [
		new Mandelbrot.RainbowColourMap(),
		new Mandelbrot.RGBColourMap()
	]
});

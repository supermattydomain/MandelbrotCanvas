if (typeof(Mandelbrot) === 'undefined') {
	Mandelbrot = {};
}

/**
 * A canvas displaying the Mandelbrot set.
 * 
 * @param canvas
 *            A jQuery wrapper around the HTML5 canvas element to draw into
 * @param cmap
 *            Name of the colourmap to use
 * @param etCalcName
 *            Name of the escape-time calculator to use
 */
Mandelbrot.MandelbrotCanvas = function(canvas, etCalc, cmap) {
	this.canvas = canvas;
	this.context = this.canvas[0].getContext("2d");
	this.imageData = this.context.getImageData(0, 0, this.canvas.width(),
			this.canvas.height());
	this.centreRl = 0;
	this.centreIm = 0;
	this.scale = 5 / Math.min(this.imageData.width, this.imageData.height);
	this.maxIter = 100;
	this.normalised = true;
	/**
	 * A radius of 2 is mathematically sufficient (as any point whose modulus
	 * exceeds two escapes to infinity). However, setting radius > 2 improves
	 * the smoothness of the colouring.
	 */
	this.radius = 3;
	this.setFractalType(etCalc);
	this.setColourMap(cmap);
};

$.extend(Mandelbrot.MandelbrotCanvas.prototype, {
	colToX : function(c) {
		return (c + 0.5 - this.imageData.width / 2)
				* this.scale + this.centreRl;
	},
	rowToY : function(r) {
		// Inversion due to the canvas' inverted-Y co-ordinate system.
		// The set is symmetrical, but the co-ordinates are shown to the user.
		return -(r + 0.5 - this.imageData.height / 2)
				* this.scale + this.centreIm;
	},
	makeColour: function(cmap, n, lastVal, power, maxIter, normalised) {
		// points in set are black
		if (n === maxIter) {
			return [0, 0, 0, 255];
		}
		// Lazily generate this colourmap's table of colours
		if (!cmap.colourMap.length) {
			cmap.genColourMap();
		}
		// outside set, iteration count modulo entire colourmap size selects colour
		if (!normalised) {
			// Return an entry directly from the colour map
			return cmap.colourMap[n % cmap.colourMap.length];
		}
		/**
		 * Generate a fractional normalised iteration count, then use it to interpolate
		 * between two neighbouring colour map entries.
		 */
		n = Math.max(0, n + 1 - Math.log(Math.log(lastVal)) / Math.log(power));
		return interpolateColour(
			cmap.colourMap[Math.floor(n) % cmap.colourMap.length],
			cmap.colourMap[(Math.floor(n) + 1) % cmap.colourMap.length],
			n - Math.floor(n)
		);
	},
	/**
	 * The below performs the calculations and redraws in
	 * multiple calls to a function using setTimeout, so that
	 * the browser can redraw the UI between calls.
	 * TODO: Use web worker if available
	 */
	update : function() {
		var bandHeightMin = 10, bandHeightMax = 20;
		var r = 0, that = this, bandHeight = Math.max(
			bandHeightMin,
			Math.min(
				bandHeightMax,
				Math.floor(this.imageData.height / 10)
			)
		);
		this.stop();
		this.canvas.trigger(Mandelbrot.eventNames.renderProgress, 0);
		function updateFunc(mandelbrot, myUpdateTimeout) {
			var rowEnd = Math.min(r + bandHeight, mandelbrot.canvas.height()), c, x, y, et, colour, percent;
			mandelbrot.imageData = mandelbrot.context.getImageData(
				0, 0, mandelbrot.canvas.width(), mandelbrot.canvas.height()
			);
			for (; r < rowEnd; r++) {
				for (c = 0; c < mandelbrot.imageData.width; c++) {
					x = mandelbrot.colToX(c);
					y = mandelbrot.rowToY(r);
					et = mandelbrot.calc.escapeTime.call(
						mandelbrot.calc, x, y,
						mandelbrot.maxIter,
						mandelbrot.radius,
						mandelbrot.normalised
					);
					colour = mandelbrot.makeColour(
						mandelbrot.cmap,
						et[0], et[1], et[2],
						mandelbrot.maxIter,
						mandelbrot.normalised
					);
					if (mandelbrot.updateTimeout !== myUpdateTimeout) {
						return; // Abort - no longer the current render thread
					}
					setPixel(
						mandelbrot.imageData, c, r,
						colour[0], colour[1], colour[2], colour[3]
					);
				}
			}
			// TODO: Only need to blit one scanline
			mandelbrot.context.putImageData(mandelbrot.imageData, 0, 0);
			percent = Math.floor((r * 100.0) / mandelbrot.imageData.height);
			if (r < mandelbrot.canvas.height()) {
				// TODO: Animate the progress bar smoothly.
				// FIXME: This animates it, but all of the
				// animation occurs after rendering is complete:
				/*
				 * $('.ui-progressbar-value').stop(true).animate({width: percent + '%'}, 1000, function() {
				 *     mandelbrot.canvas.trigger(Mandelbrot.eventNames.renderProgress, percent);
				 * });
				 */
				mandelbrot.canvas.trigger(Mandelbrot.eventNames.renderProgress, percent);
				mandelbrot.updateTimeout = setTimeout(function() {
					updateFunc(mandelbrot, mandelbrot.updateTimeout);
				});
			} else {
				mandelbrot.context.putImageData(mandelbrot.imageData, 0, 0);
				mandelbrot.canvas.trigger(Mandelbrot.eventNames.renderProgress, 100);
			}
		}
		this.updateTimeout = setTimeout(function() {
			updateFunc(that, that.updateTimeout);
		});
	},
	stop : function() {
		clearTimeout(this.updateTimeout);
		this.updateTimeout = null;
	},
	/**
	 * NOTE: I would like to simply translate and scale the
	 * canvas here; but at time of writing, there is no portable
	 * way to retrieve the canvas' current transform matrix. So
	 * I simply do my own, manual transforms. One could
	 * implement (and some have) a polyfill for this: maintain a
	 * 'shadow' copy of the canvas' current transform matrix,
	 * over-ride every relevant canvas mutator so it
	 * concatenates the newly-applied transform with the shadow
	 * matrix, then regurgitate the shadow matrix on demand.
	 * 
	 * NOTE: No, that would not work. The Canvas' putImageData
	 * method does not use the transformation matrix. You can
	 * however draw a canvas onto another canvas, possibly with
	 * transformation.
	 */
	getCentre : function() {
		return [ this.centreRl, this.centreIm ];
	},
	setCentre : function(rl, im) {
		this.centreRl = rl;
		this.centreIm = im;
	},
	getScale : function() {
		return this.scale;
	},
	setScale : function(newScale) {
		this.scale = newScale;
		return this.scale;
	},
	zoomBy : function(factor) {
		this.scale *= factor;
		return this.scale;
	},
	zoomInBy : function(factor) {
		return this.zoomBy(1 / factor);
	},
	zoomOutBy : function(factor) {
		return this.zoomBy(factor);
	},
	getMaxIter : function() {
		return this.maxIter;
	},
	setMaxIter : function(newMaxIter) {
		this.maxIter = newMaxIter;
	},
	getRadius : function() {
		return this.radius;
	},
	setRadius : function(newRadius) {
		this.radius = newRadius;
	},
	getColourMapName : function() {
		return this.cmap.name;
	},
	setColourMap : function(newCmap) {
		this.cmap = newCmap;
	},
	getFractalName : function() {
		return this.calc.name;
	},
	setFractalType : function(newCalc) {
		this.calc = newCalc;
	},
	getFractalEquation : function() {
		return this.calc.equation;
	},
	getNormalised : function() {
		return this.normalised;
	},
	setNormalised : function(newNormalised) {
		this.normalised = newNormalised;
	}
});

$.extend(Mandelbrot, {
	eventNames: {
		renderProgress: 'Mandelbrot.renderProgress'
	}
});

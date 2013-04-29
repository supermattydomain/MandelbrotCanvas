if (typeof(Mandelbrot) === 'undefined') {
	Mandelbrot = {};
}

/**
 * An HTML5 Canvas that displays an escape-time fractal.
 * 
 * @param canvas
 *            A jQuery wrapper around the HTML5 canvas element to draw into
 * @param cmap
 *            Colourmap to use
 * @param etCalcName
 *            Escape-time calculator to use
 */
Mandelbrot.DisplayCanvas = function(canvas, etCalc, cmap) {
	this.$canvas = canvas;
	this.canvas = this.$canvas[0];
	this.context = this.canvas.getContext("2d");
	this.zoom = Math.min(this.canvas.width, this.canvas.height) / 5;
	this.setFractalType(etCalc).setColourMap(cmap);
	this.bandHeight = Math.max(
		this.bandHeightMin,
		Math.min(
			this.bandHeightMax,
			Math.floor(this.canvas.height / 10)
		)
	);
};

$.extend(Mandelbrot.DisplayCanvas.prototype, {
	centreRl      : 0,
	centreIm      : 0,
	juliaRl       : 0,
	juliaIm       : 0,
	maxIter       : 100,
	julia         : false,
	normalised    : true,
	bandHeightMin : 10,
	bandHeightMax : 20,
	/**
	 * A radius of 2 is mathematically sufficient (as any point whose modulus
	 * exceeds two escapes to infinity). However, setting radius > 2 improves
	 * the smoothness of the colouring.
	 */
	radius        : 4,
	// TODO: Normalise zoom so that at zoom===1, whole set is in view.
	toggleJulia: function() {
		this.julia = !this.julia;
		return this;
	},
	isJulia: function() {
		return this.julia;
	},
	setJulia: function(newJulia) {
		this.julia = newJulia;
		return this;
	},
	colToX : function(c) {
		return (c + 0.5 - this.canvas.width / 2) / this.zoom + this.centreRl;
	},
	rowToY : function(r) {
		// Inversion due to the canvas' inverted-Y co-ordinate system.
		// The set is symmetrical, but the co-ordinates are shown to the user.
		return -(r + 0.5 - this.canvas.height / 2) / this.zoom + this.centreIm;
	},
	drawMore: function(r, imageData, startTime) {
		var that = this,
			// These avoid property lookups in the loops below
			isJulia = this.julia,
			width = this.canvas.width,
			height = this.canvas.height,
			// NOTE: This one prevents the use of 'this' in the iteration functions
			iterate = this.calc.getIterFunc(),
			maxIter = this.maxIter,
			radius = this.radius,
			normalised = this.normalised,
			cmap = this.cmap,
			rowStart = r,
			rowEnd = Math.min(rowStart + this.bandHeight, height),
			c, x0, y0,
			xinc = undefined, yinc = undefined, // Silence Eclipse warnings
			et, colour, percent, endTime
		;
		if (isJulia) {
			xinc = this.juliaRl;
			yinc = this.juliaIm;
		}
		for (; r < rowEnd; r++) {
			for (c = 0; c < width; c++) {
				x0 = this.colToX(c);
				y0 = this.rowToY(r);
				if (!isJulia) {
					xinc = x0;
					yinc = y0;
				}
				et = iterate(
					isJulia,
					x0, y0,
					xinc, yinc,
					maxIter,
					radius,
					normalised
				);
				colour = cmap.makeColour(
					et[0], et[1], et[2],
					maxIter,
					normalised
				);
				if (!this.running) {
					this.$canvas.trigger(Mandelbrot.eventNames.renderEnd);
					return; // Aborted
				}
				setPixel(
					imageData, c, r,
					colour[0], colour[1], colour[2], colour[3]
				);
			}
		}
		endTime = new Date();
		this.context.putImageData(imageData, 0, 0, 0, rowStart, width, rowEnd - rowStart);
		this.$canvas.trigger(Mandelbrot.eventNames.pixelsPerSecond, rowEnd * width * 1000 / (endTime - startTime));
		if (r < height) {
			percent = Math.floor((r * 100.0) / height);
			// TODO: Animate the progress bar smoothly.
			// FIXME: This animates it, but all of the
			// animation occurs after rendering is complete:
			/*
			 * $('.ui-progressbar-value').stop(true).animate({width: percent + '%'}, 1000, function() {
			 *     this.$canvas.trigger(Mandelbrot.eventNames.renderProgress, percent);
			 * });
			 */
			this.$canvas.trigger(Mandelbrot.eventNames.renderProgress, percent);
			setImmediate(function() {
				r = that.drawMore(r, imageData, startTime);
			});
		} else {
			this.$canvas.trigger(Mandelbrot.eventNames.renderEnd);
		}
		return r;
	},
	/**
	 * The below performs the calculations and redraws in
	 * multiple calls to a function using setImmediate, so that
	 * the browser can redraw the UI between calls.
	 * TODO: Use web worker if available
	 */
	update : function() {
		var r = 0, that = this,
			imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height),
			startTime = undefined // Silence Eclipse warning
		;
		this.stop();
		// The following is wrapped in a setImmediate to give the preceding stop() a chance to take effect.
		// If this is not done, multiple updates can run in pseudo-parallel, yielding corrupt drawing.
		// This occurs despite the fact that current Javascript interpreters are single-threaded.
		setImmediate(function() {
			that.running = true;
			that.$canvas.trigger(Mandelbrot.eventNames.renderStart);
			startTime = new Date();
			setImmediate(function() {
				r = that.drawMore(r, imageData, startTime);
			});
		});
		return this;
	},
	stop : function() {
		this.running = false;
		return this;
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
	 * transformation. But that sounds slow.
	 */
	getCentre : function() {
		return [ this.centreRl, this.centreIm ];
	},
	setCentre : function(rl, im) {
		this.centreRl = rl;
		this.centreIm = im;
		return this;
	},
	setJuliaConstant: function(rl, im) {
		this.juliaRl = rl;
		this.juliaIm = im;
		return this;
	},
	getJuliaConstant: function() {
		return [ this.juliaRl, this.juliaIm ];
	},
	getEquation: function() {
		var ret = this.calc.getEquation(this.julia);
		if (this.julia) {
			ret += ', where C = ' + this.juliaRl + ' + ' + this.juliaIm + 'i';
		}
		return ret;
	},
	getZoom : function() {
		return this.zoom;
	},
	setZoom : function(newZoom) {
		this.zoom = newZoom;
		return this;
	},
	zoomBy : function(factor) {
		this.zoom *= factor;
		return this;
	},
	zoomInBy : function(factor) {
		this.zoomBy(factor);
		return this;
	},
	zoomOutBy : function(factor) {
		this.zoomBy(1 / factor);
		return this;
	},
	getMaxIter : function() {
		return this.maxIter;
	},
	setMaxIter : function(newMaxIter) {
		this.maxIter = newMaxIter;
		return this;
	},
	getRadius : function() {
		return this.radius;
	},
	setRadius : function(newRadius) {
		this.radius = newRadius;
		return this;
	},
	getColourMap : function() {
		return this.cmap;
	},
	setColourMap : function(newCmap) {
		this.cmap = newCmap;
		return this;
	},
	getFractalType : function() {
		return this.calc;
	},
	setFractalType : function(newCalc) {
		this.calc = newCalc;
		return this;
	},
	getNormalised : function() {
		return this.normalised;
	},
	setNormalised : function(newNormalised) {
		this.normalised = newNormalised;
		return this;
	}
});

$.extend(Mandelbrot, {
	eventNames: {
		renderProgress: 'Mandelbrot.renderProgress',
		pixelsPerSecond: 'Mandelbrot.pixelsPerSecond',
		renderStart: 'Mandelbrot.renderStart',
		renderEnd: 'Mandelbrot.renderEnd'
	}
});

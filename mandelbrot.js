/**
 * The Mandelbrot set using Javascript and a canvas for image pixel access.
 */

jQuery(function() {
	(function($) {
		var canvas = $('#mandelbrot'),
			displayMouseRl = $('#mouserl'), displayMouseIm = $('#mouseim'),
			displayCentreRl = $('#centrerl'), displayCentreIm = $('#centreim'),
			displayScale = $('#scale'), displayMaxIter = $('#maxiter'),
			displayColourMap = $('#colourmap'), displayFractalType = $('#fractaltype'),
			displayNormalised = $('#normalised'), displayRadius = $('#radius'),
			displayEquation = $('#equation'), mandelbrot,
			buttonZoomIn = $('#zoomin'), buttonZoomOut = $('#zoomout'),
			buttonStop = $('#stop'), displayName = $('#name'),
			resizable = $('.resizable'),
			renderProgress = $('#renderProgress');
		function makeColour(cmap, n, lastVal, power, maxIter, normalised) {
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
		}
		/**
		 * Various ways of mapping escape-time values to a repeating range of colours.
		 */
		var colourMaps = {
		    /**
		     * A ramp through the rainbow in hue.
		     */
		    'rainbow': {
		    	numGradations: 50, // Gradations per colour map
		    	colourMap: [],
		    	genColourMap: function() {
		    		var h = 0, s = 0.6, v = 0.8, i;
		    		for (i = 0; i < this.numGradations; i++) {
		    			var rgb = hsvToRgb(h + (i / this.numGradations), s, v);
		    			this.colourMap[i] = [ rgb[0], rgb[1], rgb[2], 255 ];
		    		}
		    	}
		    },
		    /**
		     * A 'smooth' ramp from red to green to blue and back to red.
		     */
		   	'smooth': {
		    	numGradations: 20, // Gradations per colour transition; three transitions per colour map
		    	colourMap: [],
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
		    }
		};
		/**
		 * Calculate number of iterations of Mandelbrot function (ie terms in
		 * sequence) before given point z = (x(1) + y(1)i) escapes circle of given
		 * radius. For the Mandelbrot set relation, any point that escapes a circle
		 * of radius 2 increases to infinity and therefore is not in the set. If we
		 * reach n iterations, give up and return n.
		 * TODO: The below calculations might be more efficient in polar co-ords.
		 */
		var escapeTimeCalculators = {
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
			'mandelbrot': {
				equation: 'z<sub>n+1</sub> = z<sub>n</sub><sup>2</sup> + z<sub>0</sub>',
		    	escapeTime: function(x, y, maxIter, radius, normalised) {
		    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius, q;
		    		// Optimisation: is this point inside the main point-attractor cardioid?
		    		q = (x - 0.25) * (x - 0.25) + y * y;
		    		if (q * (q + x - 0.25) < y * y / 4) {
		    			return [maxIter, 0, 2]; // Inside the cardioid
		    		}
		    		// Optimisation: is this point inside the period 2 bulb to the left of the cardioid?
		    		if ((x + 1) * (x + 1) + y * y < 0.0625) {
		    			return [maxIter, 0, 2]; // Inside period 2 bulb
		    		}

		    		for (;;) {
		    			sqrl = rl * rl;
		    			sqim = im * im;
		    			if (sqrl + sqim > sqr) {
		    				break;
		    			}
		    			im = (2 * rl * im) + y;
		    			rl = sqrl - sqim + x;
		    			if (++i >= maxIter) {
		    				return [maxIter, 0, 2];
		    			}
		    		}

		    		if (normalised) {
		        		return [i, Math.sqrt(sqrl + sqim), 2];    			
		    		}
		    		return [i, 0, 2];
		    	}
		    },
		    /**
		     * Mandelbrot cubic: z(n+1) = z(n)^3 + z(0)
		     * R(n+1) = R(n)(R(n)^2 - 3I(n)^2) + R(0)
		     * and
		     * I(n+1) = I(n)((3R(n)^2 - I(n)^2) + I(0))
		     */
		    'mandelbrot cubic': {
		    	equation: 'z<sub>n+1</sub> = z<sub>n</sub><sup>3</sup> + z<sub>0</sub>',
		    	escapeTime: function(x, y, maxIter, radius, normalised) {
		    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius, newrl;

		    		for (;;) {
		    			sqrl = rl * rl;
		    			sqim = im * im;
		    			if (sqrl + sqim > sqr) {
		    				break;
		    			}
		    			newrl = rl * (sqrl - 3 * sqim) + x;
		    			im = im * (3 * sqrl - sqim) + y;
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
		    	equation: 'z<sub>n+1</sub> = z<sub>n</sub><sup>4</sup> + z<sub>0</sub>',
		    	escapeTime: function(x, y, maxIter, radius, normalised) {
		    		var rl = x, im = y, sqrl = 0, sqim = 0, newrl, i = 0, sqr = radius * radius;

		    		for (;;) {
		    			sqrl = rl * rl;
		    			sqim = im * im;
		    			if (sqrl + sqim > sqr) {
		    				break;
		    			}
		    			newrl = sqrl * sqrl + sqim * sqim - 6 * sqrl * sqim + x;
		    			im = 4 * sqrl * rl * im - 4 * rl * sqim * im + y;
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
		    },
		    /**
		     * Mandelbrot quintic: z(n+1) = z(n)^5 + z(0)
		     */
		    'mandelbrot quintic': {
		    	equation: 'z<sub>n+1</sub> = z<sub>n</sub><sup>5</sup> + z<sub>0</sub>',
		    	escapeTime: function(x, y, maxIter, radius, normalised) {
		    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

		    		for (;;) {
		    			sqrl = rl * rl;
		    			sqim = im * im;
		    			if ((sqrl + sqim) > sqr) {
		    				break;
		    			}
		    			rl = (rl * ((sqrl * (sqrl - sqim)) - (9 * sqrl * sqim) + (5 * sqim * sqim))) + x;
		    			im = (im * ((sqim * (sqim - (10 * sqrl))) + (5 * sqrl * sqrl))) + y;
		    			if (++i >= maxIter) {
		    				return [maxIter, 0, 5];
		    			}
		    		}

		    		if (normalised) {
		        		return [i, Math.sqrt(sqrl + sqim), 5];
		    		}
		    		return [i, 0, 5];
		    	}
		    },
			/**
			 * Mandelbrot conjugate aka Mandelbar aka Tricorn: z(n+1) = con(z)^2 + z(0)
			 */
		    'mandelbrot conjugate': {
		    	equation: 'z<sub>n+1</sub> = z&#x0305;<sub>n</sub><sup>2</sup> + z<sub>0</sub>',
		    	escapeTime: function(x, y, maxIter, radius, normalised) {
		    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

		    		for (;;) {
		    			sqrl = rl * rl;
		    			sqim = im * im;
		    			if (sqrl + sqim > sqr) {
		    				break;
		    			}
		    			im = (-2 * rl * im) + y;
		    			rl = sqrl - sqim + x;
		    			if (++i >= maxIter) {
		    				return [maxIter, 0, 2];
		    			}
		    		}

		    		if (normalised) {
		        		return [i, Math.sqrt(sqrl + sqim), 2];
		    		}
		    		return [i, 0, 2];
		    	}
			},
			/**
			 * Mandelbrot conjugate cubic: z(n+1) = con(z)^3 + z(0)
			 */
		    'mandelbrot conjugate cubic': {
		    	equation: 'z<sub>n+1</sub> = z&#x0305;<sub>n</sub><sup>3</sup> + z<sub>0</sub>',
		    	escapeTime: function(x, y, maxIter, radius, normalised) {
		    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

		    		for (;;) {
		    			sqrl = rl * rl;
		    			sqim = im * im;
		    			if (sqrl + sqim > sqr) {
		    				break;
		    			}
		    			rl = rl * (sqrl - (3 * sqim)) + x;
		    			im = im * (sqim - (3 * sqrl)) + y;
		    			if (++i >= maxIter) {
		    				return [maxIter, 0, 3];
		    			}
		    		}

		    		if (normalised) {
		        		return [i, Math.sqrt(sqrl + sqim), 3];
		    		}
		    		return [i, 0, 3];
		    	}
			},
			/**
			 * Mandelbrot conjugate quartic: z(n+1) = con(z)^4 + z(0)
			 */
		    'mandelbrot conjugate quartic': {
		    	equation: 'z<sub>n+1</sub> = z&#x0305;<sub>n</sub><sup>4</sup> + z<sub>0</sub>',
		    	escapeTime: function(x, y, maxIter, radius, normalised) {
		    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

		    		for (;;) {
		    			sqrl = rl * rl;
		    			sqim = im * im;
		    			if (sqrl + sqim > sqr) {
		    				break;
		    			}
		    			rlim = rl * im;
		    			diffsq = sqrl - sqim;
		    			im = y - (4 * rlim * diffsq);
		    			rl = (diffsq * diffsq) - (4 * rlim * rlim) + x;
		    			if (++i >= maxIter) {
		    				return [maxIter, 0, 4];
		    			}
		    		}

		    		if (normalised) {
		        		return [i, Math.sqrt(sqrl + sqim), 4];
		    		}
		    		return [i, 0, 4];
		    	}
			},
			/**
			 * Mandelbrot conjugate quintic: z(n+1) = con(z)^5 + z(0)
			 */
		    'mandelbrot conjugate quintic': {
		    	equation: 'z<sub>n+1</sub> = z&#x0305;<sub>n</sub><sup>5</sup> + z<sub>0</sub>',
		    	escapeTime: function(x, y, maxIter, radius, normalised) {
		    		var rl = x, im = y, sqrl = 0, sqim = 0, i = 0, sqr = radius * radius;

		    		for (;;) {
		    			sqrl = rl * rl;
		    			sqim = im * im;
		    			if ((sqrl + sqim) > sqr) {
		    				break;
		    			}
		    			rl = (rl * ((sqrl * (sqrl - sqim)) + (sqim * ((5 * sqim) - (9 * sqrl))))) + x;
		    			im = (im * ((sqim * (sqrl - sqim)) + (sqrl * ((9 * sqim) - (5 * sqrl))))) + y;
		    			if (++i >= maxIter) {
		    				return [maxIter, 0, 5];
		    			}
		    		}

		    		if (normalised) {
		        		return [i, Math.sqrt(sqrl + sqim), 5];
		    		}
		    		return [i, 0, 5];
		    	}
			}
		};
		/**
		 * A panel displaying the Mandelbrot set.
		 * @param canvas A jQuery wrapper around the HTML5 canvas element to draw into
		 * @param cmap Name of the colourmap to use
		 * @param etCalcName Name of the escape-time calculator to use
		 */
		function Mandelbrot(canvas, cmapName, etCalcName) {
			this.canvas = canvas;
			this.context = this.canvas[0].getContext("2d");
			this.imageData = this.context.getImageData(0, 0, this.canvas.width(), this.canvas.height());
			this.centreRl = 0;
			this.centreIm = 0;
			this.scale = 5 / Math.min(this.imageData.width, this.imageData.height);
			this.maxIter = 100;
			this.normalised = true;
			/**
			 * A radius of 2 is mathematically sufficient (as any point whose modulus exceeds two escapes to infinity).
			 * However, setting radius > 2 improves the smoothness of the colouring.
			 */
			this.radius = 3;
			this.setFractalType(etCalcName);
			this.setColourMapName(cmapName);
		}
		$.extend(Mandelbrot.prototype, {
			colToX: function(c) {
				return  (c + 0.5 - this.imageData.width  / 2) * this.scale + this.centreRl;
			},
			rowToY: function(r) {
				// Inversion due to the canvas' inverted-Y co-ordinate system.
				// The set is symmetrical, but the co-ordinates are shown to the user.
				return -(r + 0.5 - this.imageData.height / 2) * this.scale + this.centreIm;
			},
			/**
			 * The below performs the calculations and redraws in multiple calls
			 * to a function using setTimeout, so that the browser can redraw
			 * the UI between calls.
			 * TODO: Use web worker if available
			 */
			update: function() {
				var bandHeightMin = 10, bandHeightMax = 20;
				var r = 0, that = this, bandHeight = Math.max(bandHeightMin, Math.min(bandHeightMax, Math.floor(this.imageData.height / 10)));
				this.stop();
				renderProgress.progressbar('option', 'value', 0);
				function updateFunc(mandelbrot, myUpdateTimeout) {
					var rowEnd = Math.min(r + bandHeight, mandelbrot.canvas.height()), c, x, y, et, colour;
					mandelbrot.imageData = mandelbrot.context.getImageData(0, 0, mandelbrot.canvas.width(), mandelbrot.canvas.height());
					for (; r < rowEnd; r++) {
						for (c = 0; c < mandelbrot.imageData.width; c++) {
							x = mandelbrot.colToX(c);
							y = mandelbrot.rowToY(r);
							et = mandelbrot.calc.escapeTime.call(mandelbrot.calc, x, y, mandelbrot.maxIter, mandelbrot.radius, mandelbrot.normalised);
							colour = makeColour(mandelbrot.cmap, et[0], et[1], et[2], mandelbrot.maxIter, mandelbrot.normalised);
							if (mandelbrot.updateTimeout !== myUpdateTimeout) {
								return; // Abort - no longer the current render thread
							} 
							setPixel(mandelbrot.imageData, c, r, colour[0], colour[1], colour[2], colour[3]);
						}
					}
					// TODO: Only need to blit one scanline
					mandelbrot.context.putImageData(mandelbrot.imageData, 0, 0);
					var percent = Math.floor((r * 100.0) / mandelbrot.imageData.height);
					if (r < mandelbrot.canvas.height()) {
						// TODO: Animate the progress bar smoothly.
						// FIXME: This animates it, but all of the animation occurs after rendering is complete:
						/*
						$('.ui-progressbar-value').stop(true).animate({width: percent + '%'}, 1000, function() {
							renderProgress.progressbar('option', 'value', percent);
						});
						*/
						renderProgress.progressbar('option', 'value', percent);
						mandelbrot.updateTimeout = setTimeout(function() {
							updateFunc(mandelbrot, mandelbrot.updateTimeout);
						});
					} else {
						mandelbrot.context.putImageData(mandelbrot.imageData, 0, 0);
						renderProgress.progressbar('option', 'value', 100);
					}
				}
				this.updateTimeout = setTimeout(function() {
					updateFunc(that, that.updateTimeout);
				});
			},
			stop: function() {
				clearTimeout(this.updateTimeout);
				this.updateTimeout = null;
			},
			/**
			 * NOTE: I would like to simply translate and scale the canvas here;
			 * but at time of writing, there is no portable way to retrieve the canvas'
			 * current transform matrix. So I simply do my own, manual transforms.
			 * One could implement (and some have) a polyfill for this:
			 * maintain a 'shadow' copy of the canvas' current transform matrix,
			 * over-ride every relevant canvas mutator so it concatenates the newly-applied transform
			 * with the shadow matrix, then regurgitate the shadow matrix on demand.
			 * 
			 * NOTE: No, that would not work.
			 * The Canvas' putImageData method does not use the transformation matrix.
			 * You can however draw a canvas onto another canvas, possibly with transformation.
			 */
			getCentre: function() {
				return [ this.centreRl, this.centreIm ];
			},
			setCentre: function(rl, im) {
				this.centreRl = rl;
				this.centreIm = im;
			},
			getScale: function() {
				return this.scale;
			},
			setScale: function(newScale) {
				this.scale = newScale;
				return this.scale;
			},
			zoomBy: function(factor) {
				this.scale *= factor;
				return this.scale;
			},
			zoomInBy: function(factor) {
				return this.zoomBy(1 / factor);
			},
			zoomOutBy: function(factor) {
				return this.zoomBy(factor);
			},
			getMaxIter: function() {
				return this.maxIter;
			},
			setMaxIter: function(newMaxIter) {
				this.maxIter = newMaxIter;
			},
			getRadius: function() {
				return this.radius;
			},
			setRadius: function(newRadius) {
				this.radius = newRadius;
			},
			getColourMapName: function() {
				return this.cmapName;
			},
			setColourMapName: function(newCmapName) {
				if (!(newCmapName.toLowerCase() in colourMaps)) {
					throw 'Unknown colour map name "' + newCmapName + "'";
				}
				this.cmapName = newCmapName;
				this.cmap = colourMaps[newCmapName.toLowerCase()];
			},
			getFractalType: function() {
				return this.etCalcName;
			},
			setFractalType: function(newCalcName) {
				if (!(newCalcName.toLowerCase() in escapeTimeCalculators)) {
					throw 'Unknown escape time calculator name "' + newCalcName + "'";
				}
				this.etCalcName = newCalcName;
				this.calc = escapeTimeCalculators[newCalcName.toLowerCase()];
			},
			getFractalEquation: function() {
				return this.calc.equation;
			},
			getNormalised: function() {
				return this.normalised;
			},
			setNormalised: function(newNormalised) {
				this.normalised = newNormalised;
			}
		});
		// Create a Mandelbrot set and controls
		for (cmapName in colourMaps) {
			// Generate an entry in the drop-down select list for this colour map
			var option = $(document.createElement('option'));
			option.text(ucFirstAll(cmapName));
			displayColourMap.append(option);
		}
		for (etCalcName in escapeTimeCalculators) {
			// Generate an entry in the drop-down select list for this fractal type
			var option = $(document.createElement('option'));
			option.text(ucFirstAll(etCalcName));
			displayFractalType.append(option);
		}
		mandelbrot = new Mandelbrot(canvas, displayColourMap.val(), displayFractalType.val());
		function updateControls() {
			displayCentreRl.val(mandelbrot.getCentre()[0]);
			displayCentreIm.val(mandelbrot.getCentre()[1]);
			displayScale.val(mandelbrot.getScale());
			displayColourMap.val(mandelbrot.getColourMapName());
			displayMaxIter.val(mandelbrot.getMaxIter());
			displayFractalType.val(mandelbrot.getFractalType());
			displayNormalised.prop('checked', mandelbrot.getNormalised());
			displayRadius.val(mandelbrot.getRadius());
			displayEquation.html(mandelbrot.getFractalEquation());
			displayName.text(mandelbrot.getFractalType());
		}
		function update() {
			updateControls();
			mandelbrot.update();
		}
		canvas.on('mousemove', function(event) {
			displayMouseRl.val(mandelbrot.colToX(event.pageX - canvas.offset().left + 0.5));
			displayMouseIm.val(mandelbrot.rowToY(event.pageY - canvas.offset().top + 0.5));
		}).on('click', function(event) {
			mandelbrot.setCentre(mandelbrot.colToX(event.pageX - canvas.offset().left + 0.5), mandelbrot.rowToY(event.pageY - canvas.offset().top + 0.5));
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
		displayColourMap.on('change', function() {
			mandelbrot.setColourMapName($(this).val());
			update();
		});
		displayFractalType.on('change', function() {
			mandelbrot.setFractalType($(this).val());
			update();
		});
		buttonZoomIn.on('click', function() {
			mandelbrot.zoomInBy(2);
			update();
		});
		buttonZoomOut.on('click', function() {
			mandelbrot.zoomOutBy(2);
			update();
		});
		buttonStop.on('click', function() {
			mandelbrot.stop();
		});
		displayNormalised.on('change', function() {
			mandelbrot.setNormalised($(this).prop('checked'));
			update();
		});
		displayRadius.on('change', function() {
			mandelbrot.setRadius($(this).val());
			update();
		});
		resizable.resizable({ handles: "all", animate: false, ghost: true, autohide: false, aspectRatio: false });
		resizable.on('resizestop', function(event, ui) {
			canvas.css({ width: '100%', height: '100%' });
			canvas[0].width = canvas.width();
			canvas[0].height = canvas.height();
			mandelbrot.update();
		});
		$('#preset1').on('click', function() {
			// A Julia set within the Mandelbrot set.
			mandelbrot.setCentre(-0.743643887037151, 0.131825904205330);
			mandelbrot.setMaxIter(5000);
			mandelbrot.setScale(9.094947017729283e-14);
			update();
		});
		renderProgress.progressbar({value: 0, max: 100});
		update();
	})(jQuery);
});
jQuery.noConflict();

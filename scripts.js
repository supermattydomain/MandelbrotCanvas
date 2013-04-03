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
			buttonJulia = $('#toggleJulia'),
			resizable = $('.resizable'),
			renderProgress = $('#renderProgress'),
			displayPixelsPerSecond = $('#pixelsPerSecond'),
			displayJuliaRl = $('#juliarl'),
			displayJuliaIm = $('#juliaim'),
			onlyJulia = $('.onlyJulia'),
			renderProgressText = $('#renderProgressText');
		// Populate escape-time calculator and colourmap drop-down lists
		$(Mandelbrot.colourMaps).each(function(i, cmap) {
			// Generate an entry in the drop-down select list for this colour map
			var option = $('<option>');
			option.val(cmap.name).text(ucFirstAll(cmap.name)).data('modelObject', cmap);
			if (!i) {
				option.attr('selected', 'selected');
			}
			displayColourMap.append(option);
		});
		$(Mandelbrot.escapeTimeCalculators).each(function(i, calc) {
			// Generate an entry in the drop-down select list for this fractal type
			var option = $('<option>');
			option.val(calc.name).text(ucFirstAll(calc.name)).data('modelObject', calc);
			if (!i) {
				option.attr('selected', 'selected');
			}
			displayFractalType.append(option);
		});
		// Create a Mandelbrot set and controls
		mandelbrot = new Mandelbrot.MandelbrotCanvas(canvas, Mandelbrot.escapeTimeCalculators[0], Mandelbrot.colourMaps[0]);
		function update() {
			displayCentreRl.val(mandelbrot.getCentre()[0]);
			displayCentreIm.val(mandelbrot.getCentre()[1]);
			displayJuliaRl.val(mandelbrot.getJuliaConstant()[0]);
			displayJuliaIm.val(mandelbrot.getJuliaConstant()[1]);
			displayScale.val(mandelbrot.getScale());
			displayColourMap.val(mandelbrot.getColourMap().name);
			displayMaxIter.val(mandelbrot.getMaxIter());
			displayFractalType.val(mandelbrot.getFractalType().name);
			displayNormalised.prop('checked', mandelbrot.getNormalised());
			displayRadius.val(mandelbrot.getRadius());
			displayEquation.html(mandelbrot.getEquation());
			displayName.text(displayFractalType.find(':selected').text());
			buttonJulia.val(mandelbrot.isJulia() ? 'Mandelbrot' : 'Julia');
			onlyJulia.css('visibility', mandelbrot.isJulia() ? 'visible' : 'hidden');
			mandelbrot.update();
		}
		displayCentreRl.add(displayCentreIm).on('change', function() {
			mandelbrot.setCentre(parseFloat(displayCentreRl.val()), parseFloat(displayCentreIm.val()));
			update();
		});
		displayJuliaRl.add(displayJuliaIm).on('change', function() {
			mandelbrot.setJuliaConstant(parseFloat(displayJuliaRl.val()), parseFloat(displayJuliaIm.val()));
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
			mandelbrot.setColourMap($(this).find(':selected').data('modelObject'));
			update();
		});
		displayFractalType.on('change', function() {
			mandelbrot.setFractalType($(this).find(':selected').data('modelObject'));
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
		buttonJulia.on('click', function() {
			mandelbrot.toggleJulia();
			if (mandelbrot.isJulia()) {
				// When switching to Julia set, use current centre of view as Julia constant
				mandelbrot.setJuliaConstant.apply(mandelbrot, mandelbrot.getCentre());
			}
			update();
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
			mandelbrot.setFractalType(Mandelbrot.escapeTimeCalculators[0])
			.setJulia(false)
			.setColourMap(Mandelbrot.colourMaps[0])
			.setNormalised(true)
			.setCentre(-0.743643887037151, 0.131825904205330)
			.setMaxIter(5000)
			.setScale(1.318989403545856e-13);
			update();
		});
		canvas.on('mousemove', function(event) {
			displayMouseRl.text(mandelbrot.colToX(event.pageX - canvas.offset().left + 0.5));
			displayMouseIm.text(mandelbrot.rowToY(event.pageY - canvas.offset().top  + 0.5));
		}).on('mouseleave', function() {
			displayMouseRl.val('');
			displayMouseIm.val('');
		}).on('click', function(event) {
			mandelbrot.setCentre(
				mandelbrot.colToX(event.pageX - canvas.offset().left + 0.5),
				mandelbrot.rowToY(event.pageY - canvas.offset().top + 0.5)
			).zoomInBy(2);
			update();
		}).on(Mandelbrot.eventNames.renderProgress, function(event, percentDone) {
			renderProgress.progressbar('option', 'value', percentDone);
			renderProgressText.text(percentDone + '% complete');
		}).on(Mandelbrot.eventNames.pixelsPerSecond, function(event, pixelsPerSecond) {
			displayPixelsPerSecond.text(roundPlaces(pixelsPerSecond, 2));
		}).on(Mandelbrot.eventNames.renderStart, function() {
			buttonStop.removeAttr('disabled');
		}).on(Mandelbrot.eventNames.renderEnd, function() {
			buttonStop.attr('disabled', 'disabled');
			renderProgressText.text('Finished');
		});
		renderProgress.progressbar({value: 0, max: 100});
		update();
	})(jQuery);
});
jQuery.noConflict();

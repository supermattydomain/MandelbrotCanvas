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
			renderProgress = $('#renderProgress');
		// Create a Mandelbrot set and controls
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
		mandelbrot = new Mandelbrot.MandelbrotCanvas(canvas, Mandelbrot.escapeTimeCalculators[0], Mandelbrot.colourMaps[0]);
		function update() {
			displayCentreRl.val(mandelbrot.getCentre()[0]);
			displayCentreIm.val(mandelbrot.getCentre()[1]);
			displayScale.val(mandelbrot.getScale());
			displayColourMap.val(mandelbrot.getColourMap().name);
			displayMaxIter.val(mandelbrot.getMaxIter());
			displayFractalType.val(mandelbrot.getFractalType().name);
			displayNormalised.prop('checked', mandelbrot.getNormalised());
			displayRadius.val(mandelbrot.getRadius());
			displayEquation.html(mandelbrot.getFractalType().equation);
			displayName.text(displayFractalType.find(':selected').text());
			buttonJulia.val(mandelbrot.isJulia() ? 'Mandelbrot' : 'Julia');
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
			mandelbrot.setCentre(-0.743643887037151, 0.131825904205330);
			mandelbrot.setMaxIter(5000);
			mandelbrot.setScale(1.318989403545856e-13);
			update();
		});
		$(mandelbrot.canvas).on(Mandelbrot.eventNames.renderProgress, function(event, percentDone) {
			renderProgress.progressbar('option', 'value', percentDone);
		});
		renderProgress.progressbar({value: 0, max: 100});
		update();
	})(jQuery);
});
jQuery.noConflict();

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

$(function() {
	var canvas = $('#mandelbrot');
	var context = canvas[0].getContext("2d");
	var imageData = context.getImageData(0, 0, canvas.width(), canvas.height());
	drawHLine(imageData, 1, 1, imageData.width, 255, 0, 0, 128);
	context.putImageData(imageData, 0, 0);
});

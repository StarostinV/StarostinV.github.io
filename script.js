import Interactive from "https://vectorjs.org/interactive.js";


class AngleControl {
    constructor(interactive, circle, color) {
    	let control = interactive.control(circle.cx, circle.cy + circle.r);
    	let line = interactive.line(0, 0, 0, 0);
  
    	line.stroke = color;
    	line.style.setProperty('stroke-width', 2);
    	control.handle.stroke = color;
    	control.point.stroke = color;
    	control.point.fill = color;

    	control.constrainTo(circle);

    	line.update = function () {
		    this.x1 = circle.cx;
		    this.y1 = circle.cy;
		    this.x2 = control.x;
		    this.y2 = control.y;
		};

		control.update();
		line.update();
		line.addDependency(control);

		this.control = control;
    	this.line = line;
    }
}

function getCoords(center, point, coef){
	return {
		x: center.x + coef * (point.x - center.x),
		y: center.y + coef * (point.y - center.y),
	}
}

function angleFromCoords(center, coords) {
	let angle = Math.atan2(coords.y - center.y, coords.x - center.x);
	if (angle < 0) { angle += 2 * Math.PI; }
	return angle;
}


function describeArc(center, start, end, radius, coef){
	let pad = 0.04;

	let start1 = getCoords(center, start, coef - pad);
	let end1 = getCoords(center, end, coef - pad);
	let start2 = getCoords(center, end, coef + pad);
	let end2 = getCoords(center, start, coef + pad);

	let start_angle = angleFromCoords(center, start);
	let end_angle = angleFromCoords(center, end);
	let correction_angle = (end_angle < start_angle) ? 2 * Math.PI : 0;

	let large_arc = (Math.abs(correction_angle + end_angle - start_angle) > Math.PI) ? 1 : 0;

    let d = [
        "M", start1.x, start1.y, 
        "A", radius * (coef - pad) , radius * (coef - pad), 0, large_arc, 1, end1.x, end1.y,
        "L", start2.x, start2.y, 
        "A", radius * (coef + pad) , radius * (coef + pad), 0, large_arc, 0, end2.x, end2.y,
        "L", start1.x, start1.y
    ].join(" ");

    return {d: d, start_angle: start_angle, end_angle: end_angle};       
}


function hourToCoords(time, center, radius) {
	let angle = time / 12 * Math.PI;

	return {
		x: center.x + radius * Math.cos(angle),
		y: center.y + radius * Math.sin(angle),
	}
}


class ClockLabels {
	constructor(interactive, circle) {

		let cx = circle.cx;
		let cy = circle.cy;
		let r = circle.r + 12;

		this.t1 = interactive.text(cx - 5, cy + r + 10, '12 pm');
		this.t2 = interactive.text(cx - 5, cy - r , '12 am');
		this.t3 = interactive.text(cx + r, cy - 5, '6 pm');
		this.t4 = interactive.text(cx - r - 30, cy - 5, '6 am');

		let hours = [...Array(24).keys()];

		hours.forEach((hour) => {
			let coords = hourToCoords(hour, {x: cx, y: cy}, circle.r);
			interactive.circle(coords.x, coords.y, 5);
		});
	}
}



class ParticipantControl {
	constructor(interactive, circle, color, coef) {
		let ac1 = new AngleControl(interactive, circle, color);
		let ac2 = new AngleControl(interactive, circle, color);
	    let path = interactive.path('');

	    path.classList.add('default');

	    path.root.style.stroke = color;
	    path.root.style.fill = color;

	    let control1 = ac1.control;
	    let control2 = ac2.control;

	    path.update = function () {
	        let arcParams = describeArc({x: circle.cx, y: circle.cy}, {x: control1.x, y: control1.y}, {x: control2.x, y: control2.y}, circle.r, coef);
	        path.d = arcParams.d;
	        this.start_angle = arcParams.start_angle;
	        this.end_angle = arcParams.end_angle;
	    };
	    path.update();
	    path.addDependency(control1);
	    path.addDependency(control2);

	    this.ac1 = ac1;
	    this.ac2 = ac2;
	    this.path = path;
	}
}




// Construct an interactive within the HTML element with the id "my-interactive"
let radius = 250;

let interactive = new Interactive("time-circle");

interactive.border = true;
interactive.width = 1600;
interactive.height = 800;
// Construct a control point at the the location (100, 100)
let circle = interactive.circle(400, 400, radius);

let labels = new ClockLabels(interactive, circle);

circle.classList.add('default');


let c1 = new ParticipantControl(interactive, circle, "coral", 0.8);
let c2 = new ParticipantControl(interactive, circle, "cornflowerblue", 0.7);
let c3 = new ParticipantControl(interactive, circle, "blueviolet", 0.6);
let c4 = new ParticipantControl(interactive, circle, "red", 0.5);
let c5 = new ParticipantControl(interactive, circle, "Aquamarine", 0.4);
let c6 = new ParticipantControl(interactive, circle, "DeepPink", 0.3);

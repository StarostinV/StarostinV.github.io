import Interactive from "https://vectorjs.org/interactive.js";


class AngleControl {
    constructor(interactive, circle, color, angle = 0.) {
        let control = interactive.control(circle.cx, circle.cy + circle.r);
        let line = interactive.line(0, 0, 0, 0);

        this.control = control;
        this.line = line;
        this.circle = circle;

        line.stroke = color;
        line.style.setProperty("stroke-width", 2);
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

        this.rotate(angle);
        line.addDependency(control);

    }

    updateGeometry() {
        this.control.update();
        this.line.update();
    }

    calcAngle() {
        return Math.atan2(this.control.y - this.circle.cy, this.control.x - this.circle.cx);
    }

    rotate(angle) {
        let newAngle = this.calcAngle() + angle / 180 * Math.PI;
        this.control.x = this.circle.r * Math.cos(newAngle) + this.circle.cx;
        this.control.y = this.circle.r * Math.sin(newAngle) + this.circle.cy;
        this.updateGeometry();
    }

    remove() {
        this.control.remove();
        this.line.remove();
    }
}

function getCoords(center, point, coef) {
    return {
        x: center.x + coef * (point.x - center.x),
        y: center.y + coef * (point.y - center.y),
    }
}

function angleFromCoords(center, coords) {
    let angle = Math.atan2(coords.y - center.y, coords.x - center.x);
    if (angle < 0) {
        angle += 2 * Math.PI;
    }
    return angle;
}


function describeArc(center, start, end, radius, coef) {
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
        "A", radius * (coef - pad), radius * (coef - pad), 0, large_arc, 1, end1.x, end1.y,
        "L", start2.x, start2.y,
        "A", radius * (coef + pad), radius * (coef + pad), 0, large_arc, 0, end2.x, end2.y,
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


class Participant {
    constructor(key, name, color, coef, angle1, angle2) {
        this.key = key;
        this.name = name;
        this.color = color;
        this.coef = coef;
        this.angle1 = angle1;
        this.angle2 = angle2;
    }
}


class ParticipantStack {
    constructor(colors, firstCoef = 0.2, deltaCoef = 0.1) {
        this.participants = colors.map((c, i) =>
            new Participant(i, String(i), c, firstCoef + deltaCoef * i, i * 45, i * 45 + 120)
        )
        this.usedParticipants = {};
    }

    isEmpty() {
        return (this.participants.length === 0);
    }

    addParticipant() {
        let newParticipant = this.participants.shift();
        newParticipant.name = "";
        this.usedParticipants[newParticipant.key] = newParticipant;
        return newParticipant;
    }

    removeParticipant(key) {
        this.participants.push(this.usedParticipants[key]);
        delete this.usedParticipants[key];
    }
}


class ParticipantControl {
    constructor(participant, interactive, circle) {
        this.participant = participant
        let ac1 = new AngleControl(interactive, circle, participant.color, participant.angle1);
        let ac2 = new AngleControl(interactive, circle, participant.color, participant.angle2);
        let path = interactive.path("");

        path.classList.add("default");

        path.root.style.stroke = participant.color;
        path.root.style.fill = participant.color;

        let control1 = ac1.control;
        let control2 = ac2.control;

        path.update = function () {
            let arcParams = describeArc(
                {x: circle.cx, y: circle.cy},
                {x: control1.x, y: control1.y},
                {x: control2.x, y: control2.y},
                circle.r, participant.coef
            );
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

    remove() {
        this.ac1.remove();
        this.ac2.remove();
        this.path.remove();
    }
}


class BeamtimeClocks {
    constructor(
        interactive,
        width = 1000,
        height = 800,
        radius = 250.,
        cx = 400,
        cy = 400,
        border = false
    ) {
        this.interactive = interactive;
        this.interactive.border = border;
        this.interactive.width = width;
        this.interactive.height = height;
        this.circle = this.interactive.circle(cx, cy, radius);
        this.circle.classList.add("default");
        this.participantStack = new ParticipantStack([
            "coral", "cornflowerblue", "blueviolet", "red", "Aquamarine", "DeepPink", "blue", "orange"
        ]);
        this.participantControls = {};
        this.initLabels();
        this.mode12hours = true;
    }

    initLabels() {
        let cx = this.circle.cx;
        let cy = this.circle.cy;
        let r = this.circle.r + 12;

        this.t1 = this.interactive.text(cx - 5, cy + r + 10, "12 pm");
        this.t2 = this.interactive.text(cx - 5, cy - r, "12 am");
        this.t3 = this.interactive.text(cx + r, cy - 5, "6 pm");
        this.t4 = this.interactive.text(cx - r - 30, cy - 5, "6 am");

        let hours = [...Array(24).keys()];

        hours.forEach((hour) => {
            let coords = hourToCoords(hour, {x: cx, y: cy}, this.circle.r);
            this.interactive.circle(coords.x, coords.y, 5);
        });
    }

    to12hours() {
        this.t1.contents = "12 pm";
        this.t2.contents = "12 am";
        this.t3.contents = "6 pm";
        this.t4.contents = "6 am";
        this.mode12hours = true;
    }

    to24hours() {
        this.t1.contents = "00:00";
        this.t2.contents = "12:00";
        this.t3.contents = "18:00";
        this.t4.contents = "06:00";
        this.mode12hours = false;
    }


    addParticipant(name = null) {
        if (this.participantStack.isEmpty()) return;
        let newParticipant = this.participantStack.addParticipant();
        if (name) newParticipant.name = name;

        this.participantControls[newParticipant.key] = new ParticipantControl(
            newParticipant, this.interactive, this.circle
        );
        return newParticipant;
    }

    removeParticipant(key) {
        let participantControl = this.participantControls[key];
        participantControl.remove();
        this.participantStack.removeParticipant(key);
        delete this.participantControls[key];
    }
}

const _createInputForm = (idNum, color) => {
    return `
<div class="input-group" role="group" id="input-group-${idNum}">
  <input type="text" class="form-control" placeholder="New participant" id="input_${idNum}">
  <button 
    class="btn btn-close" 
    type="button"
    style="background-color: ${color}"
    id="closeBtn_${idNum}" 
    onclick="window.removeParticipantByClick(${idNum})"
  >✕</button>
</div>
`
}

class InputStack {
    constructor() {
        this.form = document.getElementById("form");
    }

    addInput(participant) {
        this.form.insertAdjacentHTML('beforeend', _createInputForm(participant.key, participant.color));
    }

    removeInput(key) {
        document.getElementById(`input-group-${key}`).outerHTML = "";
    }
}


function removeParticipantByClick(idNum) {
    console.log(idNum);
    window.inputStack.removeInput(idNum);
    window.beamtimeClocks.removeParticipant(idNum);
}


let interactive = new Interactive("time-circle");
const beamtimeClocks = new BeamtimeClocks(interactive);

let addParticipantBtn = interactive.button(800, 200, "Add participant");

let changeClockBtn = interactive.button(100, 100, "To 24 hour clock");

changeClockBtn.onclick = () => {
    if (beamtimeClocks.mode12hours) {
        changeClockBtn.label.contents = "To 12 hour clock";
        beamtimeClocks.to24hours();
    } else {
        changeClockBtn.label.contents = "To 24 hour clock";
        beamtimeClocks.to12hours();

    }
}


let inputStack = new InputStack();

addParticipantBtn.onclick = () => {
    let participant = beamtimeClocks.addParticipant();
    if (participant) inputStack.addInput(participant);
}

window.inputStack = inputStack;
window.beamtimeClocks = beamtimeClocks;
window.removeParticipantByClick = removeParticipantByClick;

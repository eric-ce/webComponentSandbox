import * as Cesium from "cesium";
import {
    createPointEntity,
    createLineEntity,
    createDistanceLabel,
} from "./helper.js";

/**
 * Represents a three-point curve measurement tool in Cesium.
 * @class
 * @param {Cesium.Viewer} viewer - The Cesium Viewer instance.
 * @param {Cesium.ScreenSpaceEventHandler} handler - The event handler for screen space.
 * @param {HTMLElement} nameOverlay - The HTML element for displaying names.
 */
class ThreePointsCurve {
    constructor(viewer, handler, nameOverlay) {
        this.viewer = viewer;
        this.handler = handler;
        this.nameOverlay = nameOverlay;

        this.button = null;

        this.pointEntities = new Cesium.EntityCollection();
        this.lineEntities = new Cesium.EntityCollection();
        this.labelEntities = new Cesium.EntityCollection();
    }

    /**
     * Initializes the measurement tool, creating UI elements and setting up event listeners.
     */
    initializeMeasurement() {
        // create distance button
        this.button = document.createElement("button");
        this.button.className = "curve cesium-button";
        this.button.innerHTML = "Cruve";
        document.body
            .querySelector("measure-toolbox")
            .shadowRoot.querySelector(".toolbar")
            .appendChild(this.button);
        // add event listener to distance button
        this.button.addEventListener("click", () => {
            this.setupInputActions();
        });
    }

    /**
     * Sets up input actions for three points curve mode.
     */
    setupInputActions() {
        this.removeAllInputActions();

        this.handler.setInputAction((movement) => {
            this.handleCurveLeftClick(movement);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        this.handler.setInputAction((movement) => {
            this.handleCurveMouseMove(movement);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }

    /**
     * Handles left-click events to place points, draw and calculate curves.
     * @param {{position: Cesium.Cartesian2}} movement - The movement event from the mouse.
     */
    handleCurveLeftClick(movement) {
        this.viewer.selectedEntity = undefined;
        this.viewer.trackedEntity = undefined;

        const cartesian = this.viewer.scene.pickPosition(movement.position);

        // Check if the position is defined
        if (!Cesium.defined(cartesian)) return;


        const pointEntity = this.viewer.entities.add(
            createPointEntity(cartesian, Cesium.Color.RED)
        );
        this.pointEntities.add(pointEntity);

        // Check if we have collected 3 points, then measure the curve distance
        if (this.pointEntities.values.length === 3) {
            const [start, middle, end] = this.pointEntities.values.map((p) =>
                p.position.getValue(Cesium.JulianDate.now())
            );

            // create curve points
            const numInterpolationPoints = Math.max(
                Math.round(
                    Cesium.Cartesian3.distance(start, middle) +
                    Cesium.Cartesian3.distance(middle, end)
                ) * 50,
                50
            );

            const curvePoints = this.createCurvePoints(
                start,
                middle,
                end,
                numInterpolationPoints
            );

            // create curve line entity
            const curveLineEntity = this.viewer.entities.add(
                createLineEntity(curvePoints, Cesium.Color.YELLOW)
            );
            this.lineEntities.add(curveLineEntity);

            // create label
            const totalDistance = this.measureCurveDistance(curvePoints);
            const labelEntity = this.viewer.entities.add(
                createDistanceLabel(start, end, totalDistance)
            );
            this.labelEntities.add(labelEntity);

            // reset point entities
            this.pointEntities.removeAll();
            this.lineEntities.removeAll();
            this.labelEntities.removeAll();
        }
    }
    /**
     * Handles mouse move events to display moving dot with mouse.
     * @param {{endPosition: Cesium.Cartesian2}} movement
     */
    handleCurveMouseMove(movement) {
        const pickedObject = this.viewer.scene.pick(movement.endPosition);
        if (Cesium.defined(pickedObject)) {
            const cartesian = this.viewer.scene.pickPosition(movement.endPosition);
            if (!Cesium.defined(cartesian)) return;

            this.updateMovingDot(cartesian)
        }
    }

    /**
     * Creates curve points between three specified points.
     * @param {Cesium.Cartesian3} startPoint - The starting point of the curve.
     * @param {Cesium.Cartesian3} middlePoint - The middle point of the curve.
     * @param {Cesium.Cartesian3} endPoint - The ending point of the curve.
     * @param {number} numInterpolationPoints - The number of interpolation points to create.
     * @returns {Cesium.Cartesian3[]} An array of points representing the curve.
     */
    createCurvePoints(
        startPoint,
        middlePoint,
        endPoint,
        numInterpolationPoints
    ) {
        const spline = new Cesium.CatmullRomSpline({
            times: [0, 0.5, 1],
            points: [startPoint, middlePoint, endPoint],
        });

        return Array.from({ length: numInterpolationPoints }, (_, i) =>
            spline.evaluate(i / numInterpolationPoints)
        );
    }

    /**
     * Measures the distance along a curve.
     *
     * @param {Cesium.Cartesian3[]} curvePoints - The points along the curve.
     * @returns {number} The total distance of the curve.
     */
    measureCurveDistance(curvePoints) {
        return curvePoints.reduce(
            (acc, point, i, arr) =>
                i > 0
                    ? acc + Cesium.Cartesian3.distance(arr[i - 1], point)
                    : acc,
            0
        );
    }

    /**
     * update the moving dot with mouse
     * @param {Cesium.Cartesian3} cartesian  
     */
    updateMovingDot(cartesian) {
        const screenPosition = Cesium.SceneTransforms.wgs84ToWindowCoordinates(this.viewer.scene, cartesian);
        this.nameOverlay.style.display = 'block';
        this.nameOverlay.style.left = `${screenPosition.x - 5}px`;
        this.nameOverlay.style.top = `${screenPosition.y - 5}px`;
        this.nameOverlay.style.backgroundColor = "yellow";
        this.nameOverlay.style.borderRadius = "50%"
        this.nameOverlay.style.width = "1px";
        this.nameOverlay.style.height = "1px";
    }

    /**
     * Removes all input actions from the handler.
     */
    removeAllInputActions() {
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MIDDLE_CLICK);
    }
}

export { ThreePointsCurve };
import { PerspectiveCamera, Vector3 } from "three";
import type { HoverGroundVehicle } from "./GameEntities/Vehicle";

const HUD_ANCHOR_HEIGHT_MULTIPLIER = 2.25;

type VehicleHudElement = {
    root: HTMLDivElement;
    name: HTMLDivElement;
    healthFill: HTMLDivElement;
};

export class HudOverlaySystem {
    private readonly root: HTMLDivElement;
    private readonly canvas: HTMLCanvasElement;
    private readonly vehicleElements = new Map<string, VehicleHudElement>();
    private readonly projectionScratch = new Vector3();

    constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.root = document.createElement("div");
        this.root.className = "world-hud-layer";
        container.appendChild(this.root);
    }

    update(vehicles: HoverGroundVehicle[], camera: PerspectiveCamera): void {
        const activeVehicleIds = new Set<string>();

        for (let i = 0; i < vehicles.length; i += 1) {
            const vehicle = vehicles[i];
            const display = vehicle.getHudDisplay();

            if (!display.isVisible) {
                continue;
            }

            activeVehicleIds.add(vehicle.id);
            const element = this.getOrCreateVehicleElement(vehicle.id);
            const healthPercent = Math.max(
                0,
                Math.min(1, display.health.current / display.health.max),
            );

            element.name.textContent = display.name;
            element.healthFill.style.width = `${healthPercent * 100}%`;

            const anchorPosition = vehicle.getPosition().clone();
            anchorPosition.y += vehicle.getCollisionRadius() *
                HUD_ANCHOR_HEIGHT_MULTIPLIER;

            this.projectionScratch.copy(anchorPosition).project(camera);

            const isOnScreen = this.projectionScratch.z >= -1 &&
                this.projectionScratch.z <= 1 &&
                this.projectionScratch.x >= -1 &&
                this.projectionScratch.x <= 1 &&
                this.projectionScratch.y >= -1 &&
                this.projectionScratch.y <= 1;

            element.root.classList.toggle("vehicle-hud-hidden", !isOnScreen);

            if (!isOnScreen) {
                continue;
            }

            const screenX = (this.projectionScratch.x * 0.5 + 0.5) *
                this.canvas.clientWidth;
            const screenY = (-this.projectionScratch.y * 0.5 + 0.5) *
                this.canvas.clientHeight;

            element.root.style.transform =
                `translate(-50%, -100%) translate(${screenX}px, ${screenY}px)`;
        }

        this.vehicleElements.forEach((element, vehicleId) => {
            if (activeVehicleIds.has(vehicleId)) {
                return;
            }

            element.root.remove();
            this.vehicleElements.delete(vehicleId);
        });
    }

    dispose(): void {
        this.vehicleElements.clear();
        this.root.remove();
    }

    private getOrCreateVehicleElement(vehicleId: string): VehicleHudElement {
        const existingElement = this.vehicleElements.get(vehicleId);

        if (existingElement) {
            return existingElement;
        }

        const root = document.createElement("div");
        root.className = "vehicle-hud";

        const name = document.createElement("div");
        name.className = "vehicle-hud-name";

        const healthBar = document.createElement("div");
        healthBar.className = "vehicle-health-bar";

        const healthFill = document.createElement("div");
        healthFill.className = "vehicle-health-fill";

        healthBar.appendChild(healthFill);
        root.append(name, healthBar);
        this.root.appendChild(root);

        const element = { root, name, healthFill };
        this.vehicleElements.set(vehicleId, element);
        return element;
    }
}

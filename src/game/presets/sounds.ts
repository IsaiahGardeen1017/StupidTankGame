import blasterPistolUrl from "../../assets/sounds/BLASTER_PISTOL.wav";
import dc15BlasterRifleUrl from "../../assets/sounds/DC15_BLASTER_RIFLE.wav";
import deathtrooperRifleUrl from "../../assets/sounds/DEATHTROOPER_RIFLE.wav";
import droidekaBlasterUrl from "../../assets/sounds/DROIDEKA_BLASTER.wav";
import firesprayCannonUrl from "../../assets/sounds/FIRESPRAY_CANNON.wav";
import tieCannonUrl from "../../assets/sounds/TIE_CANNON.wav";
import xwingCannonUrl from "../../assets/sounds/XWING_CANNON.wav";

export type SoundId =
    | "BLASTER_PISTOL"
    | "DC15_BLASTER_RIFLE"
    | "DEATHTROOPER_RIFLE"
    | "DROIDEKA_BLASTER"
    | "FIRESPRAY_CANNON"
    | "TIE_CANNON"
    | "XWING_CANNON";

export const Sounds: Record<SoundId, string> = {
    BLASTER_PISTOL: blasterPistolUrl,
    DC15_BLASTER_RIFLE: dc15BlasterRifleUrl,
    DEATHTROOPER_RIFLE: deathtrooperRifleUrl,
    DROIDEKA_BLASTER: droidekaBlasterUrl,
    FIRESPRAY_CANNON: firesprayCannonUrl,
    TIE_CANNON: tieCannonUrl,
    XWING_CANNON: xwingCannonUrl,
};

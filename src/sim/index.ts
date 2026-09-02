import type { Vec3 } from "./math";

export type { Vec3 } from "./math";

export interface SimState {
  tick: number;
  player: {
    pos: Vec3;
    vel: Vec3;
    yaw: number;
    pitch: number;
    onGround: boolean;
  };
}

export interface InputCommand {
  move: { x: number; y: number };
  look: { dx: number; dy: number };
  buttons: {
    fire: boolean;
    aim: boolean;
    sprint: boolean;
    interact: boolean;
    ability: boolean;
    jump: boolean;
  };
}

export interface Sim {
  tick: (cmd: InputCommand, dt: number) => void;
  getState: () => Readonly<SimState>;
}

export function createSim(seed: number): Sim {
  const safeSeed = seed >>> 0;
  let tickCount = 0;
  let state: SimState = {
    tick: 0,
    player: {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      onGround: true,
    },
  };

  void safeSeed;

  return {
    tick: (cmd: InputCommand, dt: number) => {
      tickCount += 1;
      const moveX = cmd.move.x * dt * 2;
      const moveY = cmd.move.y * dt * 2;

      state = {
        tick: tickCount,
        player: {
          pos: {
            x: state.player.pos.x + moveX,
            y: state.player.pos.y + moveY,
            z: state.player.pos.z,
          },
          vel: {
            x: moveX / Math.max(dt, 0.0001),
            y: moveY / Math.max(dt, 0.0001),
            z: 0,
          },
          yaw: state.player.yaw + cmd.look.dx * dt,
          pitch: state.player.pitch + cmd.look.dy * dt,
          onGround: true,
        },
      };
    },
    getState: () => ({
      tick: state.tick,
      player: {
        pos: { ...state.player.pos },
        vel: { ...state.player.vel },
        yaw: state.player.yaw,
        pitch: state.player.pitch,
        onGround: state.player.onGround,
      },
    }),
  };
}

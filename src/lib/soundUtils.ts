export const SOUND_OPTIONS = [
  { value: "default", label: "Default Beep", url: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg" },
  { value: "droplet", label: "Water Droplet", url: "https://actions.google.com/sounds/v1/water/droplet_1.ogg" },
  { value: "flick", label: "Wood Flick", url: "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg" },
  { value: "chime", label: "Digital Chime", url: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg" },
];

export const playNotificationSound = (soundValue: string) => {
  const sound = SOUND_OPTIONS.find(s => s.value === soundValue);
  if (sound) {
    const audio = new Audio(sound.url);
    audio.play().catch(e => console.log("Audio play failed:", e));
  }
};

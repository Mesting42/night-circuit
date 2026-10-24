/** Input uses positive steering for A/left and physics increases yaw for that
 * input. Route hints must follow the same convention, not world-map X direction. */
export const bendDirection = delta => delta > 0 ? '左' : '右';

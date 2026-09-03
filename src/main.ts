import { start } from './game'

const canvas = document.getElementById('stage') as HTMLCanvasElement
void start(canvas, document.body)

// Add your code here
//% color=#FFB600 weight=10 icon="\uf1e6"

namespace wildbit {

    const PCA9685_ADDRESS = 0x40

    const MODE1 = 0x00
    const MODE2 = 0x01

    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04
    const PRESCALE = 0xFE

    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09

    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD

    const STP_CHA_L = 2047
    const STP_CHA_H = 4095
    const STP_CHB_L = 1
    const STP_CHB_H = 2047
    const STP_CHC_L = 1023
    const STP_CHC_H = 3071
    const STP_CHD_L = 3071
    const STP_CHD_H = 1023

    const on = 0
    const off = 0
    const freq_hz = 60

    let initialized = false
    let neoStrip: neopixel.Strip;
    let matBuf = pins.createBuffer(17);


    export enum Servos {
        S0 = 0x01,
        S1 = 0x02,
        S2 = 0x03,
        S3 = 0x04
    }

    export enum Motors {
        //% block="M1"
        M1 = 0x1,
        //% block="M2"
        M2 = 0x2,
        //% block="M3"
        M3 = 0x3,
        //% block="M4"
        M4 = 0x4
    }


    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2ccmd(addr: number, value: number) {
        let buf = pins.createBuffer(1)
        buf[0] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE)
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE)
        return val
    }

    function initPCA9685(): void {
        i2cwrite(PCA9685_ADDRESS, MODE1, 0x00)
        setFreq(50); //1s / 20ms
        for (let idx = 0; idx < 16; idx++) {
            setPwm(idx, 0, 0);
        }
        initialized = true
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000
        prescaleval /= 4096
        prescaleval /= freq
        prescaleval = prescaleval * 25 / 24  // 0.915
        prescaleval -= 1
        let prescale = prescaleval //Math.Floor(prescaleval + 0.5);
        let oldmode = i2cread(PCA9685_ADDRESS, MODE1)
        let newmode = (oldmode & 0x7F) | 0x10 // sleep
        i2cwrite(PCA9685_ADDRESS, MODE1, newmode) // go to sleep
        i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale) // set the prescaler
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode)
        basic.pause(1)
        //control.waitMicros(5000);
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1)  //1010 0001
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;

        let buf = pins.createBuffer(5)
        buf[0] = LED0_ON_L + 4 * channel
        buf[1] = on & 0xff
        buf[2] = (on >> 8) & 0xff
        buf[3] = off & 0xff
        buf[4] = (off >> 8) & 0xff
        pins.i2cWriteBuffer(PCA9685_ADDRESS, buf)
    }

    function setStepper(index: number, dir: boolean): void {
        if (index == 1) {
            if (dir) {
                setPwm(0, STP_CHA_L, STP_CHA_H)
                setPwm(3, STP_CHB_L, STP_CHB_H)
                setPwm(1, STP_CHC_L, STP_CHC_H)
                setPwm(2, STP_CHD_L, STP_CHD_H)
            } else {
                setPwm(2, STP_CHA_L, STP_CHA_H)
                setPwm(1, STP_CHB_L, STP_CHB_H)
                setPwm(3, STP_CHC_L, STP_CHC_H)
                setPwm(0, STP_CHD_L, STP_CHD_H)
            }
        }
        else {
            if (dir) {
                setPwm(4, STP_CHA_L, STP_CHA_H)
                setPwm(7, STP_CHB_L, STP_CHB_H)
                setPwm(5, STP_CHC_L, STP_CHC_H)
                setPwm(6, STP_CHD_L, STP_CHD_H)
            } else {
                setPwm(6, STP_CHA_L, STP_CHA_H)
                setPwm(5, STP_CHB_L, STP_CHB_H)
                setPwm(7, STP_CHC_L, STP_CHC_H)
                setPwm(4, STP_CHD_L, STP_CHD_H)
            }
        }
    }

    function stopMotor(index: number) {
        setPwm((index - 1) * 2, 0, 0)
        setPwm((index - 1) * 2 + 1, 0, 0)
    }

    function MotorStopAll() {
        setPwm(2, 0, 0)
        setPwm(1, 0, 0)
        setPwm(3, 0, 0)
        setPwm(0, 0, 0)
        setPwm(6, 0, 0)
        setPwm(5, 0, 0)
        setPwm(7, 0, 0)
        setPwm(4, 0, 0)
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////


    /**
     * Servo Execute
     * @param index Servo Channel; eg: S1
     * @param degree [0-180] degree of servo; eg: 0, 90, 180
    */
    //% blockId=wildbit_servo block="Servo|%index|to angle|%degree|º"
    //% weight=100
    //% degree.min=0 degree.max=180
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function Servo(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        let v_us = (degree * 1800 / 180 + 600) // 0.6 ~ 2.4
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }


    //% blockId=wildbit_motor_run block="Motor|%index|speed %speed"
    //% weight=85
    //% speed.min=-100 speed.max=100
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRun(index: Motors, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        speed = speed * 40; // map 100 to 4096
        if (speed >= 4096) {
            speed = 4095
        }
        if (speed <= -4096) {
            speed = -4095
        }
        if (index > 4 || index <= 0)
            return
        let pp = (index - 1) * 2
        let pn = (index - 1) * 2 + 1
        if (speed >= 0) {
            setPwm(pp, 0, speed)
            setPwm(pn, 0, 0)
        } else {
            setPwm(pp, 0, 0)
            setPwm(pn, 0, -speed)
        }
    }

    //% blockId=wildbit_stop block="Stop motor|%index|"
    //% weight=80
    export function MotorStop(index: Motors): void {
        MotorRun(index, 0);
    }

    /**
     * Init RGB pixels mounted on the board.
     */
    //% blockId="robotbit_rgb" block="RGB"
    //% weight=70
    export function rgb(): neopixel.Strip {
        if (!neoStrip) {
            neoStrip = neopixel.create(DigitalPin.P16, 4, NeoPixelMode.RGB)
        }

        return neoStrip;
    }
}
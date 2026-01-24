/**
 * 入口文件
 *
 * 本文件为默认扩展入口文件，如果你想要配置其它文件作为入口文件，
 * 请修改 `extension.json` 中的 `entry` 字段；
 *
 * 请在此处使用 `export`  导出所有你希望在 `headerMenus` 中引用的方法，
 * 方法通过方法名与 `headerMenus` 关联。
 *
 * 如需了解更多开发细节，请阅读：
 * https://prodocs.lceda.cn/cn/api/guide/
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {}

class MCUInformation {
	public mcu_name: string;
	public mcu_pin_name: { [key: string]: string };
	public mcu_pin_signal: { [key: string]: string };
	public constructor(mcu_name: string, mcu_pin_name: { [key: string]: string }, mcu_pin_signal: { [key: string]: string }) {
		this.mcu_name = mcu_name;
		this.mcu_pin_name = mcu_pin_name;
		this.mcu_pin_signal = mcu_pin_signal;
	}
}

function simplifiedPinName(pinName: string): string {
	// PC14-OSC32_IN (PC14) -> PC14
	const match = pinName.match(/^(P[A-Z]\d{1,2})/);
	if (match && match[1]) {
		return match[1];
	}
	// Fallback to original name if no match
	return pinName;
}

async function edaCreateComponent(info: MCUInformation) {
	const deviceUUID = await eda.lib_Device.search(info.mcu_name);
	if (!deviceUUID) {
		eda.sys_Message.showToastMessage(`无法在元件库中找到型号为 ${info.mcu_name} 的元件！`, ESYS_ToastMessageType.ERROR);
		return;
	}
	const component = await eda.sch_PrimitiveComponent.create(deviceUUID[0], 0, 0);
	if (!component) {
		eda.sys_Message.showToastMessage(`创建元件失败！`, ESYS_ToastMessageType.ERROR);
		return;
	}

	const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(component.getState_PrimitiveId());
	if (!pins || pins.length === 0) {
		eda.sys_Message.showToastMessage(`该元件没有引脚信息，无法设置引脚名称！`, ESYS_ToastMessageType.ERROR);
		return;
	}
	let wires: ISCH_PrimitiveWire[] = [];
	for (const pin of pins) {
		const name = simplifiedPinName(pin.getState_PinName());
		if (info.mcu_pin_name[name]) {
			pin.setState_PinName(info.mcu_pin_name[name]);
		}
		console.log(`${name}.Rotation = ${pin.getState_Rotation()}`);
		const xoffset = 40;
		const yoffset = 0;
		const cosine = Math.cos((pin.getState_Rotation() * Math.PI) / 180);
		const sine = Math.sin((pin.getState_Rotation() * Math.PI) / 180);
		const adjustedXOffset = xoffset * cosine - yoffset * sine;
		const adjustedYOffset = xoffset * sine + yoffset * cosine;
		const wire_position = [pin.getState_X(), pin.getState_Y(), pin.getState_X() + adjustedXOffset, pin.getState_Y() + adjustedYOffset];
		if (info.mcu_pin_name[name]) {
			const wire = await eda.sch_PrimitiveWire.create(wire_position, info.mcu_pin_signal[name]);
			if (wire) {
				wires.push(wire);
				console.log(wire);
			}
		}
		console.log(pin);
	}

	await component.done();
	for (const wire of wires) {
		await wire.done();
	}
	eda.sys_Message.showToastMessage(`元件创建成功！`, ESYS_ToastMessageType.INFO);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function importCubeMXIOC(): Promise<void> {
	const file: File | undefined = (await eda.sys_FileSystem.openReadFileDialog('ioc')) as any;
	if (!file) {
		return;
	}

	file.text().then((text: string) => {
		// 按行读取
		const lines = text.split(/\r?\n/);
		let info = new MCUInformation('', {}, {});
		let mcu_gpio_name: { [key: string]: boolean } = {};

		for (const line of lines) {
			if (line.startsWith('Mcu.CPN=')) {
				info.mcu_name = line.replace('Mcu.CPN=', '').trim();
			} else if (line.startsWith('Mcu.Pin')) {
				// Mcu.Pin0=PC14-OSC32_IN (PC14)
				const declared_name = simplifiedPinName(line.replace(/Mcu\.Pin\d+=/, '').trim());
				info.mcu_pin_name[declared_name] = declared_name;
				mcu_gpio_name[declared_name] = false;
			} else {
				// Read For 'A'='B'
				const parts = line.split('=');
				// remove '\\'
				const A = parts[0].replace(/\\\\/g, '');
				if (A.endsWith('.Signal')) {
					const declared_name = simplifiedPinName(A.replace('.Signal', ''));
					if (info.mcu_pin_name[declared_name] === undefined) {
						continue;
					}
					// User-Label Exists
					if (mcu_gpio_name[declared_name]) {
						continue;
					}
					const signals = parts[1];
					info.mcu_pin_signal[declared_name] = signals;
				} else if (A.endsWith('.GPIO_Label')) {
					const declared_name = simplifiedPinName(A.replace('.GPIO_Label', ''));
					if (info.mcu_pin_name[declared_name] === undefined) {
						continue;
					}
					const gpio_label = parts[1];
					info.mcu_pin_signal[declared_name] = gpio_label;
					mcu_gpio_name[declared_name] = true;
				}
			}
		}

		if (info.mcu_name !== '') {
			eda.sys_Message.showToastMessage(`读取成功`, ESYS_ToastMessageType.INFO);
			edaCreateComponent(info);
		} else {
			eda.sys_Message.showToastMessage(`该元件没有引脚信息，无法设置引脚名称！`, ESYS_ToastMessageType.ERROR);
		}
	});
}

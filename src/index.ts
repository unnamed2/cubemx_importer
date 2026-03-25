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

enum OperationType {
	NC,
	NCWithLabel,
	Connect_to,
}

class Rule {
	public operation: OperationType = OperationType.NC;
	public net = '';
	public rule_name = '';
}

function VDD_signal_tester(pin_name: string): boolean {
	return (
		pin_name.toUpperCase().includes('VDD') &&
		!pin_name.toUpperCase().includes('VDDA') &&
		!pin_name.toUpperCase().includes('VDD33') &&
		!pin_name.toUpperCase().includes('VDD50')
	);
}

function VSS_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('VSS') && !pin_name.toUpperCase().includes('VSSA');
}

function VBAT_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('VBAT');
}

function VDDA_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('VDDA');
}

function VSSA_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('VSSA');
}

function VDD33_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('VDD33');
}

function VDD50_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('VDD50');
}

function VCAP_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('VCAP');
}

function BOOT0_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('BOOT0');
}

function BOOT1_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('BOOT1');
}

function NRST_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('NRST') || pin_name.toUpperCase().includes('RESET');
}

function PDR_ON_signal_tester(pin_name: string): boolean {
	return pin_name.toUpperCase().includes('PDR_ON');
}

const Tester: { [key: string]: (pin_name: string) => boolean } = {
	'VDD': VDD_signal_tester,
	'VSS': VSS_signal_tester,
	'VBAT': VBAT_signal_tester,
	'VDDA': VDDA_signal_tester,
	'VSSA': VSSA_signal_tester,
	'VDD33': VDD33_signal_tester,
	'VDD50': VDD50_signal_tester,
	'VCAP': VCAP_signal_tester,
	'BOOT0': BOOT0_signal_tester,
	'BOOT1': BOOT1_signal_tester,
	'NRST': NRST_signal_tester,
	'PDR_ON': PDR_ON_signal_tester,
};

function matchRule(pin_name: string, rule_name: string): boolean {
	if (Tester[rule_name]) {
		return Tester[rule_name](pin_name);
	} else {
		return false;
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

function createWireOnPin(pin: ISCH_PrimitiveComponentPin, net: string) {
	const xoffset = 40;
	const yoffset = 0;
	const cosine = Math.cos((pin.getState_Rotation() * Math.PI) / 180);
	const sine = Math.sin((pin.getState_Rotation() * Math.PI) / 180);
	const adjustedXOffset = xoffset * cosine - yoffset * sine;
	const adjustedYOffset = xoffset * sine + yoffset * cosine;
	const wire_position = [pin.getState_X(), pin.getState_Y(), pin.getState_X() + adjustedXOffset, pin.getState_Y() + adjustedYOffset];
	return eda.sch_PrimitiveWire.create(wire_position, net);
}

/*
interface CreateInterface {
	libraryUuid: string;
	uuid: string;
}

const Resistor: CreateInterface = {
	libraryUuid: '0819f05c4eef4c71ace90d822a990e87',
	uuid: 'b948db94476e4027ac8953235755ec96',
};

const Capacitor: CreateInterface = {
	libraryUuid: '0819f05c4eef4c71ace90d822a990e87',
	uuid: '96b39256cc3f4d80bd3b503deb4f3328',
};

async function placeCapacitorOrResistor(
	pin: ISCH_PrimitiveComponentPin,
	component: ISCH_PrimitiveComponent | ISCH_PrimitiveComponent_2,
): Promise<ISCH_PrimitiveComponentPin | undefined> {
	console.log(`Placing component ${component.getState_PrimitiveId()} on pin ${pin.getState_PinName()}`);
	let component_pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(component.getState_PrimitiveId());
	console.log(`Component has pins:`, component_pins);
	if (!component_pins || component_pins.length !== 2) {
		return undefined;
	}

	let xOffset = component_pins[0].getState_X() - pin.getState_X();
	let yOffset = component_pins[0].getState_Y() - pin.getState_Y();
	component.setState_X(pin.getState_X() + xOffset);
	component.setState_Y(pin.getState_Y() + yOffset);
	console.log(`Moved component to (${component.getState_X()}, ${component.getState_Y()})`);
	await component.done();
	console.log(
		`Component placed. Pin 1 at (${component_pins[0].getState_X()}, ${component_pins[0].getState_Y()}), Pin 2 at (${component_pins[1].getState_X()}, ${component_pins[1].getState_Y()})`,
	);
	return component_pins[1];
}

async function createAndPlaceComponentOnPin(
	pin: ISCH_PrimitiveComponentPin,
	ID: CreateInterface,
	net: string,
): Promise<ISCH_PrimitiveWire | undefined> {
	console.log(`Creating component ${ID.uuid} from library ${ID.libraryUuid} on pin ${pin.getState_PinName()} with net ${net}`);
	let component = await eda.sch_PrimitiveComponent.create(ID, 0, 0);
	if (!component) {
		console.error(`Failed to create component ${ID.uuid} from library ${ID.libraryUuid}`);
		return undefined;
	}

	let component_pin = await placeCapacitorOrResistor(pin, component);
	if (!component_pin) {
		console.error(`Failed to place component ${ID.uuid} on pin ${pin.getState_PinName()}`);
		return undefined;
	}

	return createWireOnPin(component_pin, net);
}
*/

async function doRule(pins: ISCH_PrimitiveComponentPin, operation: OperationType, net: string): Promise<ISCH_PrimitiveWire | undefined> {
	switch (operation) {
		case OperationType.NC:
			return;
		case OperationType.NCWithLabel:
			(pins as any).setState_NoConnected(true);
			return;
		case OperationType.Connect_to:
			return createWireOnPin(pins, net);
	}
}

async function doRules(pins: ISCH_PrimitiveComponentPin, rules: Rule[]): Promise<boolean> {
	let pin_name = pins.getState_PinName();
	for (const rule of rules) {
		if (matchRule(pin_name, rule.rule_name)) {
			console.log(`Pin ${pin_name} matches rule ${rule.rule_name} with operation ${OperationType[rule.operation]} and net ${rule.net}`);
			await doRule(pins, rule.operation, rule.net);
			return true;
		}
	}
	console.log(`Pin ${pin_name} does not match any rule.`);
	return false;
}

async function updatePins(pins: ISCH_PrimitiveComponentPin[], info: MCUInformation, rules: Rule[]): Promise<ISCH_PrimitiveWire[]> {
	let ops: ISCH_PrimitiveWire[] = [];
	console.log('Updating pins with info:', pins, info);
	for (const pin of pins) {
		const sname = simplifiedPinName(pin.getState_PinName());
		if (info.mcu_pin_name[sname]) {
			pin.setState_PinName(info.mcu_pin_name[sname]);
			let wire = await createWireOnPin(pin, info.mcu_pin_signal[sname] || '');
			if (wire) {
				ops.push(wire);
			}
		} else {
			await doRules(pin, rules);
		}
	}

	return ops;
}

async function edaCreateComponent(info: MCUInformation, rules: Rule[]) {
	const deviceUUID = await eda.lib_Device.search(info.mcu_name);
	if (!deviceUUID) {
		eda.sys_Message.showToastMessage(`无法在元件库中找到型号为 ${info.mcu_name} 的元件！`, ESYS_ToastMessageType.ERROR);
		return;
	}
	deviceUUID.filter((uuid) => {
		return uuid.manufacturerId === info.mcu_name;
	});

	if (deviceUUID.length === 0) {
		eda.sys_Message.showToastMessage(`无法在元件库中找到型号为 ${info.mcu_name} 的元件！`, ESYS_ToastMessageType.ERROR);
		return;
	}

	const device = await eda.lib_Device.get(deviceUUID[0].uuid, deviceUUID[0].libraryUuid);
	console.log(device);
	if (!device) {
		eda.sys_Message.showToastMessage(`无法在元件库中找到型号为 ${info.mcu_name} 的元件！`, ESYS_ToastMessageType.ERROR);
		return;
	}
	const component = await eda.sch_PrimitiveComponent.create(device, 0, -200);
	if (!component) {
		eda.sys_Message.showToastMessage(`创建元件失败！`, ESYS_ToastMessageType.ERROR);
		return;
	}
	console.log(component);

	let other_property = component.getState_OtherProperty();
	let subpartName = component.getState_SubPartName();
	let subpart: ISCH_PrimitiveComponent | ISCH_PrimitiveComponent_2 | undefined;
	console.log(other_property);
	console.log(subpartName);
	console.log(other_property && other_property['Multi-Part Group'] !== undefined && subpartName?.endsWith('.1'));
	if (other_property && other_property['Multi-Part Group'] !== undefined && subpartName?.endsWith('.1')) {
		let newSubpartName = subpartName.slice(0, subpartName.length - 2) + '.2';
		subpart = await eda.sch_PrimitiveComponent.create(device, 400, -200, newSubpartName);
		if (!subpart) {
			eda.sys_Message.showToastMessage(`创建元件子部件失败！`, ESYS_ToastMessageType.ERROR);
			return;
		}
		console.log(subpart);
		await subpart.done();
	}

	await component.done();

	const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(component.getState_PrimitiveId());
	if (!pins || pins.length === 0) {
		eda.sys_Message.showToastMessage(`该元件没有引脚信息，无法设置引脚名称！`, ESYS_ToastMessageType.ERROR);
		return;
	}

	if (subpart) {
		const subpartPins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(subpart.getState_PrimitiveId());
		if (subpartPins && subpartPins.length > 0) {
			pins.push(...subpartPins);
		}
	}

	await updatePins(pins, info, rules);

	eda.sys_Message.showToastMessage(`元件创建成功！`, ESYS_ToastMessageType.INFO);
}

async function modifySelectedComponentPinNames(info: MCUInformation, rules: Rule[]): Promise<void> {
	let primitives = await eda.sch_SelectControl.getAllSelectedPrimitives();
	if (primitives.length === 0) {
		eda.sys_Message.showToastMessage(`请先选择一个元件！`, ESYS_ToastMessageType.WARNING);
		return;
	}

	let isTargetComponentSelected = true;
	let pins: ISCH_PrimitiveComponentPin[] = [];
	for (const primitive of primitives) {
		let component = await eda.sch_PrimitiveComponent.get(primitive.getState_PrimitiveId());
		console.log(component);

		if (Array.isArray(component)) {
			component = component[0];
		}

		if (!component) {
			continue;
		}

		let component_pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(component.getState_PrimitiveId());
		if (!component_pins || component_pins.length === 0) {
			eda.sys_Message.showToastMessage(`选中的元件没有引脚信息，无法设置引脚名称！`, ESYS_ToastMessageType.ERROR);
			return;
		}
		pins.push(...component_pins);
	}

	if (!isTargetComponentSelected) {
		eda.sys_Message.showToastMessage(`请选择型号为 ${info.mcu_name} 的元件！`, ESYS_ToastMessageType.WARNING);
		return;
	}

	console.log(pins);
	await updatePins(pins, info, rules);
}

async function doWork(info: MCUInformation, rules: Rule[]): Promise<void> {
	let primitives = await eda.sch_SelectControl.getAllSelectedPrimitives();
	if (primitives.length === 0) {
		edaCreateComponent(info, rules);
	} else {
		modifySelectedComponentPinNames(info, rules);
	}
}

const global_info = new MCUInformation('', {}, {});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function importCubeMXIOC(): Promise<void> {
	const file = await eda.sys_FileSystem.openReadFileDialog('ioc', false);
	if (!file) {
		return;
	}

	global_info.mcu_name = '';
	global_info.mcu_pin_name = {};
	global_info.mcu_pin_signal = {};

	file.text().then((text: string) => {
		// 按行读取
		const lines = text.split(/\r?\n/);
		let mcu_gpio_name: { [key: string]: boolean } = {};

		for (const line of lines) {
			if (line.startsWith('Mcu.CPN=')) {
				global_info.mcu_name = line.replace('Mcu.CPN=', '').trim();
			} else if (line.startsWith('Mcu.Pin')) {
				// Mcu.Pin0=PC14-OSC32_IN (PC14)
				const declared_name = simplifiedPinName(line.replace(/Mcu\.Pin\d+=/, '').trim());
				global_info.mcu_pin_name[declared_name] = declared_name;
				mcu_gpio_name[declared_name] = false;
			} else {
				// Read For 'A'='B'
				const parts = line.split('=');
				// remove '\\'
				const A = parts[0].replace(/\\\\/g, '');
				if (A.endsWith('.Signal')) {
					const declared_name = simplifiedPinName(A.replace('.Signal', ''));
					if (global_info.mcu_pin_name[declared_name] === undefined) {
						continue;
					}
					// User-Label Exists
					if (mcu_gpio_name[declared_name]) {
						continue;
					}
					const signals = parts[1];
					global_info.mcu_pin_signal[declared_name] = signals;
				} else if (A.endsWith('.GPIO_Label')) {
					const declared_name = simplifiedPinName(A.replace('.GPIO_Label', ''));
					if (global_info.mcu_pin_name[declared_name] === undefined) {
						continue;
					}
					const gpio_label = parts[1];
					global_info.mcu_pin_signal[declared_name] = gpio_label;
					mcu_gpio_name[declared_name] = true;
				}
			}
		}

		if (global_info.mcu_name !== '') {
			eda.sys_Message.showToastMessage(`读取成功`, ESYS_ToastMessageType.INFO);

			const task = eda.sys_MessageBus.pull('DoGenerates', async (rules: any) => {
				console.log('Received rules from iframe:', rules);
				console.log('Info:', global_info);
				await eda.sys_IFrame.closeIFrame('settings');
				if (rules) {
					eda.sys_Message.showToastMessage('OK!');
					doWork_toIndex(global_info, rules);
				} else {
					eda.sys_Message.showToastMessage('No rules received!', ESYS_ToastMessageType.WARNING);
				}
			});

			eda.sys_IFrame.openIFrame('/iframe/rules.html', 900, 1200, 'settings', {
				maximizeButton: true,
				grayscaleMask: true,
				buttonCallbackFn: (action: string) => {
					if (action === 'close') {
						task.cancel();
					}
				},
			});
		} else {
			eda.sys_Message.showToastMessage(`该元件没有引脚信息，无法设置引脚名称！`, ESYS_ToastMessageType.ERROR);
		}
	});
}

export function doWork_toIndex(info: MCUInformation, rules: any) {
	let this_rules: Rule[] = [];
	for (const rule of rules) {
		let operation = OperationType.NC;
		switch (rule.operation) {
			case 0:
				operation = OperationType.NC;
				break;
			case 1:
				operation = OperationType.NCWithLabel;
				break;
			case 4:
				operation = OperationType.Connect_to;
				break;
		}
		this_rules.push({
			operation: operation,
			net: rule.net,
			rule_name: rule.rule_name,
		});
	}

	doWork(info, this_rules);
}

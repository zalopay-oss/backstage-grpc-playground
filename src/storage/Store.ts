type StoreOptions = {
  name: string;
}

export class Store {
  private readonly name: string;
  private readonly keys: string[] = [];

  private static globalKey: string;

  static setGlobalKey(key: string) {
    this.globalKey = key;
  } 

  constructor(options: StoreOptions) {
    this.name = options.name;
  }

  get<T = any>(key: string, defaultValue: T | null = null, emptyCheck?: (val: T | null) => boolean): T {
    const raw = localStorage.getItem(this.createJoinedKey(key));
    
    let actualVal = defaultValue;

    if (raw !== null) {
      try {
        actualVal = JSON.parse(raw);
      } catch (err) {
        // ignore
      }
    }

    if (emptyCheck && typeof emptyCheck === 'function') {
      if (emptyCheck(actualVal)) {
        actualVal = defaultValue;
      }
    }

    return actualVal as T;
  }

  set = <T = any>(key: string, value: T) => {
    this.keys.push(key);
    localStorage.setItem(this.createJoinedKey(key), JSON.stringify(value));
  }

  clear = () => {
    this.keys.forEach(this.delete)
  }

  delete = (key: string) => {
    localStorage.removeItem(this.createJoinedKey(key))
  }

  private createJoinedKey(key: string) {
    return [this.name, Store.globalKey, key].join('-');
  }
}
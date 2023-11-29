
type MyObject = {
  [key: string]: any;
};

export default class Schema {
  errorThrow: any;

  constructor(option: any = {}) {
    /*
    Object.defineProperty(
      this,
      '_SET_COLUMNS',
      {
        value: [],
        writable: true,
        enumerable: false,
        configurable: false
      }
    );
*/
  }

  static getType(value: any) {
    if (value === null) {
      return "Null";
    }
    if (value === undefined) {
      return "Undefined";
    }
    return value.constructor.name;
  }

  static isSet(val: any) {
    return Schema.getType(val) === "Undefined" || Schema.getType(val) === "Null" ? false : true;
  }

  static getBool(val: any) {
    if (typeof val === "boolean") return val;
    return val === "true" ? true : false;
  }

  static isAnonymousFunc(fn: any) {
    const fnString = fn.toString();

    if (fnString === "function(){}") return true;
    if (fnString === "function() {}") return true;
    if (fnString === "function (){}") return true;
    if (fnString === "function () {}") return true;
    if (fnString === "()=>{}") return true;
    return false;
  }

  create(state: any) {
    const className = this.constructor.name;
    const stateType = Schema.getType(state);
    let validMethods = {};

    Object.keys(state).forEach((key) => {
      // Properties .
      let values;
      let def = null;
      let type: any;
      let isAcceptNull = false;
      let isAcceptBlank = false;
      let valid: any = () => {};
      let value: any = null;

      // Assign Properties .
      if (Schema.getType(state[key]) === "Object") {
        values = state[key];
        let isEmptyObject = Object.keys(values).length === 0;
        isAcceptNull = values.isAcceptNull ? values.isAcceptNull : isAcceptNull;
        isAcceptBlank = values.isAcceptBlank ? values.isAcceptBlank : isAcceptBlank;
        def = !isEmptyObject && values.def ? values.def : def;
        value = !isEmptyObject && (values.value || values.value === "") ? values.value : values;
        value = isEmptyObject && def ? def : value;
        type = Schema.getType(value);
        valid = values.valid ? values.valid : valid;
      } else {
        value = state[key];
        def = value;
        isAcceptNull = isAcceptNull;
        isAcceptBlank = isAcceptBlank;
        type = Schema.getType(value);
        valid = valid;
      }

      // Validate Functions .
      const validFunc = (_value: any) => {
        let error = null;
        const pointer = `${className}.${key}`;
        const validValue = value;
        const validType = type;
        const paramsValue = _value;
        const paramsType = Schema.getType(_value);

        if (paramsType !== type) {
          error = `SCHEMA_TYPE : ${pointer} [validType: ${type}][paramsType: ${paramsType}]`;
        }
        if (isAcceptNull && _value === null) {
          error = `SCHEMA_IS_ACCEPT_NULL :  ${pointer}`;
        }
        if (isAcceptBlank && _value === "") {
          error = `SCHEMA_IS_ACCEPT_BLANK :  ${pointer}`;
        }
        if (Schema.getType(valid) === "Function") {
          if (valid(_value)) {
            error = `SCHEMA_YOUR_VALID_METHOD :  ${pointer}`;
          }
        }
        return {
          pointer,
          validValue,
          validType,
          paramsValue,
          paramsType,
          error,
        };
      };

      const { pointer, validValue, validType, paramsValue, paramsType, error } = validFunc(value);

      if (error === null) {
        Object.defineProperty(this, key, {
          get: () => {
            return value;
          },
          set: (_value) => {
            // pointer, validValue, validType, paramsValue, paramsType, error
            const validResult = validFunc(value);
            if (error === null) {
              value = _value;
              return { ...this, [key]: value };
            } else {
              this.validWarn(validResult);
              throw error;
            }
          },
          enumerable: true,
          configurable: true,
        });
      } else {
        if (this.errorThrow) {
          throw error;
        } else {
          console.warn(error);
        }
      }
    });
    return this;
  }

  canSet(key: any, validValue: any) {
    try {
      const currentValue = this[key as keyof Schema];
      if (currentValue === undefined) {
        return true;
      }

      if (currentValue === null) {
        return true;
      }

      if (validValue === undefined) {
        return true;
      }

      if (validValue === null) {
        return true;
      }

      const { error } = (this[key  as keyof Schema] = validValue);
      if (error) {
        return false;
      } else {
        this[key as keyof Schema] = currentValue;
        return true;
      }
    } catch (e) {
      console.warn("BAD CAN SET KEY: " + this.constructor.name + " " + key);
      console.warn("BEFOER VALUE");
      console.warn(typeof this[key as keyof Schema]);
      console.warn(this[key as keyof Schema]);
      console.warn("AFTER VALUE");
      console.warn(typeof validValue);
      console.warn(validValue);
      throw `BAD CAN SET: ${e}`;
    }
  }

  merge(params: MyObject = {}, immutable = true) {
    try {
      const paramsType = Schema.getType(params);
      const objKeys = Object.keys(params);

      if (objKeys.length > 0) {
        let mergedObj: any = { ...this };
        objKeys.forEach((key) => {
          if (this[key as keyof Schema] !== params[key]) {
            if (this.canSet(key, params[key])) {
              mergedObj[key] = params[key];
            } else {
              console.warn("BAD MERGE A : " + key + " " + params[key] + " " + typeof params[key]);
            }
          }
        });

        if (paramsType === "Array") {
          mergedObj = Object.values(mergedObj);

          /*
            class A {
              constructor() {  }
              refresh() {
                return new (<typeof A>this.constructor); 
              }
            }
          */
          return immutable ? new (<typeof Schema>this.constructor)(mergedObj) : mergedObj;
        } else {
          if (immutable) {
            //console.log( mergedObj );
            return new (<typeof Schema>this.constructor)(mergedObj);
          } else {
            return mergedObj;
          }
        }
      } else {
        return new (<typeof Schema>this.constructor)();
      }
    } catch (e) {
      if (this.errorThrow) {
        console.warn(params);
        console.warn(e);
        throw `BAD MERGE B : ${Schema.getType(params)} ${e}`;
      } else {
        console.warn(params);
        console.warn(e);
        console.warn(`BAD MERGE C : ${Schema.getType(params)} ${e}`);
        return params;
      }
    }
  }

  toJSON(obj: any = this) {
    let jsonObj: any = {};
    Object.keys(obj).forEach((key) => {
      let values: any = obj[key];
      if (values.constructor.name === "Object") {
        if (!values.type && !values.default) {
          values = this.toJSON(values);
        }
      }

      if (values.default || values.default === "" || values.default === 0) {
        jsonObj[key] = values.default;
      } else {
        jsonObj[key] = values;
      }
    });
    return jsonObj;
  }

  forEach(func: any) {
    return Object.values(this).forEach(func);
  }

  concat(func: any) {
    return this.returnImmutable(Object.values(this).concat(func), func);
  }

  map(func: any) {
    return this.returnImmutable(Object.values(this).map(func), func);
  }

  filter(func: any) {
    return this.returnImmutable(Object.values(this).filter(func), func);
  }

  reduce(func: any) {
    return this.returnImmutable(Object.values(this).reduce(func), func);
  }

  find(func: any) {
    return Object.values(this).find(func);
  }

  sort(func: any) {
    return Object.values(this).sort(func);
  }

  push(value: any) {
    const values = Object.values(this);
    values.push(value);
    return this.returnImmutable(values);
  }

  unshift(value: any) {
    const values = Object.values(this);
    values.unshift(value);
    return this.returnImmutable(values);
  }

  getShift() {
    const values = Object.values(this);
    const results = values.shift();
    return this.returnImmutable(results);
  }

  pop(value: any) {
    const values: any = Object.values(this);
    values.pop(value);
    return this.returnImmutable(values);
  }

  returnImmutable(values: any, func = () => {}) {
    if (typeof values === "undefined") {
      return new (<typeof Schema>this.constructor)();
    } else if (values.length === 0 && Object.keys(this).length === 0) {
      if (String(func).indexOf("createElement") > 0) {
        return [];
      } else {
        return new (<typeof Schema>this.constructor)(values);
      }
    } else if (values[0] && values[0]["$$typeof"] && values[0]["$$typeof"].constructor.name === "Symbol") {
      return values;
    } else {
      return new (<typeof Schema>this.constructor)(values);
    }
  }

  validWarn(validResult: any) {
    console.warn("##########################");
    console.warn("#" + validResult.pointer);
    console.warn("##########################");
    console.warn("### initializedValidType");
    console.warn(validResult.validType);
    console.warn("### initializedValidValue");
    console.warn(validResult.validValue);
    console.warn("### paramsType");
    console.warn(validResult.paramsType);
    console.warn("### paramsValue");
    console.warn(validResult.paramsValue);
    console.warn("##########################");
  }
}

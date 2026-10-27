import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyBody, extractFeatures, findMethods, matchBrace, maskSource, stubEvidence } from "../lib/java.mjs";

const SOURCE = `
public class Demo extends Stub {
    @Override
    public void working(IWearableCallbacks callbacks, String value) throws RemoteException {
        // braces in comments { must be ignored
        callbacks.onStatus(0);
        if (value != null) {
            log("nested { braces } inside a string");
        }
    }

    @Override
    public void stubby(IWearableCallbacks callbacks) throws RemoteException {
        Log.d(TAG, "unimplemented Method: stubby");
    }

    @Override
    public void unimplementedViaException(IWearableCallbacks callbacks) {
        throw new UnsupportedOperationException("nope");
    }

    @Override
    public void todo(IWearableCallbacks callbacks) {
        // TODO: implement
    }

    @Override
    public void staleLog(IWearableCallbacks callbacks) throws RemoteException {
        Log.d(TAG, "unimplemented Method: staleLog");
        callbacks.onAddLocalCapabilityResponse(new AddLocalCapabilityResponse(capabilities.add("x")));
    }

    @Override
    public void empty(IWearableCallbacks callbacks) {
    }
}
`;

test("brace matching survives strings and comments", () => {
  const open = SOURCE.indexOf("{", SOURCE.indexOf("void working"));
  const end = matchBrace(maskSource(SOURCE), open);
  const body = SOURCE.slice(open, end);
  assert.match(body, /nested \{ braces \} inside a string/);
  assert.equal(body.trim().endsWith("}"), true);
});

test("finds methods with their bodies and line numbers", () => {
  const methods = findMethods(SOURCE);
  const names = methods.map((method) => method.name);
  assert.deepEqual(names, ["working", "stubby", "unimplementedViaException", "todo", "staleLog", "empty"]);
  assert.ok(methods[0].line > 1);
  assert.match(methods[0].body, /onStatus/);
});

test("classifies implemented, stubbed and empty bodies", () => {
  const methods = new Map(findMethods(SOURCE).map((method) => [method.name, method]));
  assert.equal(classifyBody(methods.get("working").body), "implemented");
  assert.equal(classifyBody(methods.get("stubby").body), "stubbed");
  assert.equal(classifyBody(methods.get("unimplementedViaException").body), "stubbed");
  assert.equal(classifyBody(methods.get("todo").body), "stubbed");
  assert.equal(classifyBody(methods.get("staleLog").body), "partial");
  assert.equal(classifyBody(methods.get("empty").body), "empty");
});

test("stub evidence quotes the marker line", () => {
  const stub = findMethods(SOURCE).find((method) => method.name === "stubby");
  const evidence = stubEvidence(stub.body);
  assert.ok(evidence && evidence.includes("unimplemented Method: stubby"));
});

test("extracts the advertised feature array", () => {
  const features = extractFeatures(`
    public class WearableService {
        public static final Feature[] FEATURES = new Feature[]{
                new Feature("app_client", 4L),
                new Feature("wear3_oem_companion", 1L)
        };
    }
  `);
  assert.deepEqual(features, [
    { name: "app_client", version: 4 },
    { name: "wear3_oem_companion", version: 1 },
  ]);
});

test("feature extraction ignores commented-out entries", () => {
  const features = extractFeatures(`
    Feature[] FEATURES = new Feature[]{
        new Feature("real", 1L),
        // new Feature("ghost", 1L),
    };
  `);
  assert.deepEqual(features, [{ name: "real", version: 1 }]);
});

test("maskSource can preserve comments while still blanking string literals", () => {
  const withoutComments = maskSource(SOURCE);
  assert.doesNotMatch(withoutComments, /TODO: implement/);
  assert.doesNotMatch(withoutComments, /unimplemented Method: stubby/);

  const commentsOnly = maskSource(SOURCE, { keepComments: true });
  assert.match(commentsOnly, /TODO: implement/);
  assert.doesNotMatch(commentsOnly, /unimplemented Method: stubby/, "string contents stay masked");

  const everything = maskSource(SOURCE, { keepStrings: true, keepComments: true });
  assert.match(everything, /unimplemented Method: stubby/);
});

test("method bodies keep comments so TODO markers remain detectable", () => {
  const todo = findMethods(SOURCE).find((method) => method.name === "todo");
  assert.match(todo.body, /TODO: implement/);
  assert.equal(classifyBody(todo.body), "stubbed");
});

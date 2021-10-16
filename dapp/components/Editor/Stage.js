import { forwardRef, useCallback, useEffect, useRef } from "react";
import ReactReconciler from 'react-reconciler';
import { useIsomorphicLayoutEffect, usePrevious } from "react-use";
import canvas from 'canvas';
import Konva from 'konva/lib/Core';
import * as HostConfig from 'react-konva/lib/ReactKonvaHostConfig';
import { applyNodeProps, toggleStrictMode } from 'react-konva/lib/makeUpdates';

const KonvaRenderer = ReactReconciler(HostConfig);

const makeKonvaServer = (konvaRef) => {
    // mock window
    konvaRef.window = {
        Image: canvas.Image,
        devicePixelRatio: 1,
    };

    // mock document
    konvaRef.document = {
        createElement: function () { },
        documentElement: {
            addEventListener: function () { },
        },
    };

    // make some global injections
    global.requestAnimationFrame = (cb) => {
        setImmediate(cb);
    };

    // create canvas in Node env
    konvaRef.Util.createCanvasElement = () => {
        const node = new canvas.Canvas();
        node.style = {};
        return node;
    };

    // create image in Node env
    konvaRef.Util.createImageElement = () => {
        const node = new canvas.Image();
        node.style = {};
        return node;
    };

    // _checkVisibility use dom element, in node we can skip it
    konvaRef.Stage.prototype._checkVisibility = () => { };
}

const createIsomorphicStage = ({ width, height, container }) => {
    if (!Konva.isBrowser) {
        makeKonvaServer(Konva);
    }

    return new Konva.Stage({
        width,
        height,
        container,
    });
};

const useIsomorphicInitialSetup = (callback) => {
    if (!Konva.isBrowser) {
        /** Just run it */
        callback();
    }

    useIsomorphicLayoutEffect(callback, []);
}

export const StageWrap = (props) => {
    const container = useRef();
    const stage = useRef();
    const fiberRef = useRef();
    const oldProps = usePrevious(props);
    const {
        forwardedRef,
        width,
        height,
        children,
        accessKey,
        className,
        role,
        style,
        tabIndex,
        title,
    } = props;

    const setForwardedRef = useCallback((stage) => {
        if (!forwardedRef) {
            return;
        }

        if (typeof forwardedRef === 'function') {
            return forwardedRef(stage);
        }

        forwardedRef.current = stage;
    }, [stage, forwardedRef]);

    const createUpdatedContainer = useCallback(() => {
        setForwardedRef(stage.current);
        fiberRef.current = KonvaRenderer.createContainer(stage.current);
        KonvaRenderer.updateContainer(children, fiberRef.current);
    }, [stage.current, children]);

    const updateContainer = useCallback(() => {
        setForwardedRef(stage.current);
        applyNodeProps(stage.current, props, oldProps);
        KonvaRenderer.updateContainer(props.children, fiberRef.current, null);
    }, [stage.current, fiberRef.current, props, oldProps]);

    const destroyContainer = useCallback(() => {
        setForwardedRef(null);
        KonvaRenderer.updateContainer(null, fiberRef.current, null);
        stage.current?.destroy();
    }, [fiberRef.current, stage.current]);

    useIsomorphicInitialSetup(() => {
        stage.current = createIsomorphicStage({
            width,
            height,
            container: container.current
        });
        createUpdatedContainer();
        return destroyContainer;
    });

    useIsomorphicLayoutEffect(updateContainer);

    if (!Konva.isBrowser) {
        const url = stage.current.toDataURL();

        return (
            <div>
                <img
                    ref={container}
                    accessKey={accessKey}
                    className={className}
                    role={role}
                    style={style}
                    tabIndex={tabIndex}
                    title={title}
                    src={url}
                />
            </div>
        );
    }

    return (
        <div
            suppressHydrationWarning
            ref={container}
            accessKey={accessKey}
            className={className}
            role={role}
            style={style}
            tabIndex={tabIndex}
            title={title}
        />
    );
};

export const Stage = forwardRef((props, ref) => {
    return <StageWrap {...props} forwardedRef={ref} />;
});

Stage.displayName = 'Stage';
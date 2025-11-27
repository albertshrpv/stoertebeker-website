import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import "maplibre-gl/dist/maplibre-gl.css";
import ReactDOM from 'react-dom/client';
import "../../../styles/map.css";
import { Datepicker } from 'flowbite-react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';


interface Props {
    data: {
        title: string;
        text: string;
        latitude: number;
        longitude: number;
        tooltip: string;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

// Standardmarker für einen Ort
const DefaultMarker: React.FC<{ tooltip: string }> = (tooltip) => {
    return (
        <div
            className="relative flex flex-col items-center gap-2 -translate-y-6"
        >
            <div className={`absolute bottom-14 marker text-base w-96 max-w-[60vw] border-2 border-primary-500 px-6 py-4 rounded-lg bg-white space-nowrap overflow-visible`}>
                <Markup markup={tooltip.tooltip} />
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="fill-primary-500 w-12" viewBox="0 -960 960 960">
                <path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 400Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Z" />
            </svg>
        </div>
    );
};


const Map: React.FC<Props> = ({ data, padding }) => {
    const { title, text, latitude, longitude, tooltip, componentSettings, id, __component } = data;
    const isDev = import.meta.env.DEV;


    // Refs für Map, Marker und Listenelemente
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<any>(null);
    const [zoom, setZoom] = useState<number>(9);


    // Speichere Marker-Daten: Container, React-Root und Marker-Instanz
    const markersRef = useRef<Record<string, { container: HTMLElement; root: ReturnType<typeof ReactDOM.createRoot>; marker: any }>>({});


    // Disable dragPan for small devices
    useEffect(() => {
        const handleResize = () => {
            if (map.current) {
                const isSmallScreen = window.innerWidth < 768;
                if (isSmallScreen) {
                    map.current.dragPan.disable();
                } else {
                    map.current.dragPan.enable();
                }
            }
        };

        window.addEventListener('resize', handleResize);
        // Run it initially in case the screen is already small
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // --- Map initialisieren (nur einmal) ---
    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current!,
            style: "https://maps.manufaktouren-mv.de/styles/bright", // ggf. style.json falls benötigt
            center: [longitude, latitude],
            zoom: 12,
            scrollZoom: false,
            pitch: 60,
            minZoom: 9,
            maxZoom: 17,
            attributionControl: false,
        });

        map.current.addControl(
            new maplibregl.AttributionControl({
                compact: true,
                customAttribution: '',
            })
        );

        // Define the listener that updates the zoom state
        const updateZoom = () => {
            setZoom(map.current!.getZoom());
        };

        // Add the listener for the "zoom" event
        map.current.on('zoom', updateZoom);


        // Navigations-Controls hinzufügen (Zoom & Kompass)
        const navControl = new maplibregl.NavigationControl();
        map.current.addControl(navControl, 'top-right');


        // --- Custom Pitch Control mit SVG als Toggle-Button ---
        class PitchControl {
            _map!: maplibregl.Map;
            _container!: HTMLElement;
            onAdd(map: maplibregl.Map) {
                this._map = map;
                this._container = document.createElement('div');
                this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

                const button = document.createElement('button');
                button.style.padding = '5px';
                button.style.background = '#fff';
                button.style.border = 'none';
                button.style.cursor = 'pointer';
                // Hier wird das SVG als innerHTML eingefügt:
                button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#000"><path d="M480-118 120-398l66-50 294 228 294-228 66 50-360 280Zm0-202L120-600l360-280 360 280-360 280Zm0-280Zm0 178 230-178-230-178-230 178 230 178Z"/></svg>`;
                button.onclick = () => {
                    const currentPitch = map.getPitch();
                    map.easeTo({ pitch: currentPitch === 60 ? 0 : 60 });
                };

                this._container.appendChild(button);
                return this._container;
            }
            onRemove() {
                this._container.parentNode?.removeChild(this._container);
                this._map = undefined!;
            }
        }

        const pitchControl = new PitchControl();
        map.current.addControl(pitchControl, 'top-right');

        // --- Marker für jeden Ort erstellen ---
        const container = document.createElement('div');
        const root = ReactDOM.createRoot(container);
        root.render(<DefaultMarker tooltip={tooltip} />);

        const marker = new maplibregl.Marker({ element: container })
            .setLngLat([longitude, latitude])
            .addTo(map.current);

        markersRef.current[0] = { container, root, marker };

    }, []);


    return (
        <section id={componentSettings?.anchorId} className="overflow-x-clip">
            <div className={`w-full space-y-8 lg:space-y-12 2xl:space-y-16 max-w-[2000px] mx-auto ${padding}`}>
                {title &&
                    <div
                        className="markup"
                    >
                        <div
                            id={`ckeditor-${__component}-${id}-title`}
                            className="ckeditor-inline"
                            contentEditable={isDev}
                            suppressContentEditableWarning={true}
                            data-component-id={id}
                            data-component-type={__component}
                            data-field-name="title"
                        >
                            <Markup markup={title} />
                        </div>
                    </div>
                }
                {text &&
                    <div
                        className="markup"
                    >
                        <div
                            id={`ckeditor-${__component}-${id}-text`}
                            className="ckeditor-inline"
                            contentEditable={isDev}
                            suppressContentEditableWarning={true}
                            data-component-id={id}
                            data-component-type={__component}
                            data-field-name="text"
                        >
                            <Markup markup={text} />
                        </div>
                    </div>
                }
                <div className="relative w-full h-[50vh] overflow-hidden rounded-2xl border border-primary-500">
                    <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full overflow-hidden" />
                </div>
            </div>
        </section>
    );

};

export default Map;

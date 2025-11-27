import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import "maplibre-gl/dist/maplibre-gl.css";
import ReactDOM from 'react-dom/client';
import "../../styles/map.css";



// Standardmarker für einen Ort
const DefaultMarker: React.FC<{ link: string }> = ({ link }) => {

    return (
        <div
            className="w-4 h-4 bg-white border-4 border-primary-500 rounded-full z-20 hover:cursor-pointer"
            onClick={() => window.open(link, '_blank')}
        >
        </div>
    );
};


const FooterMap: React.FC = () => {
    const latitude = 53.862651202257204;
    const longitude = 11.759611246476394;


    // Refs für Map, Marker und Listenelemente
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<any>(null);
    const [zoom, setZoom] = useState<number>(9);


    // Speichere Marker-Daten: Container, React-Root und Marker-Instanz
    const markersRef = useRef<Record<string, { container: HTMLElement; root: ReturnType<typeof ReactDOM.createRoot>; marker: any }>>({});
    const markersRef2 = useRef<Record<string, { container: HTMLElement; root: ReturnType<typeof ReactDOM.createRoot>; marker: any }>>({});


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
            zoom: 7,
            scrollZoom: false,
            minZoom: 6,
            maxZoom: 10,
            attributionControl: false,
            dragPan: false,
            dragRotate: false,
            doubleClickZoom: false,
            touchZoomRotate: false,
            touchPitch: false,
        });

        // map.current.addControl(
        //     new maplibregl.AttributionControl({
        //         compact: true,
        //         customAttribution: '',
        //     })
        // );

        // Define the listener that updates the zoom state
        const updateZoom = () => {
            setZoom(map.current!.getZoom());
        };

        // Add the listener for the "zoom" event
        // map.current.on('zoom', updateZoom);


        // Navigations-Controls hinzufügen (Zoom & Kompass)
        // const navControl = new maplibregl.NavigationControl();
        // map.current.addControl(navControl, 'top-right');



        // --- Marker für jeden Ort erstellen ---
        const container = document.createElement('div');
        const root = ReactDOM.createRoot(container);
        root.render(<DefaultMarker link="https://maps.app.goo.gl/1B8V1wN1ypBoxACY9" />);

        const container2 = document.createElement('div');
        const root2 = ReactDOM.createRoot(container2);
        root2.render(<DefaultMarker link="https://maps.app.goo.gl/rvDKAhHLr8QJCz1HA" />);

        const rostock = [12.124510289909423, 54.08814608042057] as maplibregl.LngLatLike;
        const schwerin = [11.420367414111478, 53.62767569999832] as maplibregl.LngLatLike;

        // const marker = new maplibregl.Marker({ element: container })
        //     .setLngLat(rostock)
        //     .addTo(map.current);

        // const marker2 = new maplibregl.Marker({ element: container2 })
        //     .setLngLat(schwerin)
        //     .addTo(map.current);

        // markersRef.current[0] = { container, root, marker };
        // markersRef2.current[0] = { container: container2, root: root2, marker: marker2 };
    }, []);


    return (
        <div className="relative w-full h-full overflow-hidden">
            <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full overflow-hidden" />
        </div>
    );

};

export default FooterMap;

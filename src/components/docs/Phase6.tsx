import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase6() {
    return (
        <PhaseSection
            number={6}
            title="Material Logistics & Delivery Tracking"
            description="Granting real-time visibility into the physical movement of goods across the global supply chain via native API integrations."
            journeySteps={[
                "Shipment Submission: Supplier uploads Packing Lists (PL) and CMR/Shipping documents.",
                "Metadata Extraction: Automatic capture of Dispatch Dates, Carriers, and Tracking IDs.",
                "API Linking: Real-time status syncing with global carriers (Maersk/DHL/AfterShip).",
                "Conflict Handling: Automated alerts when carrier ETA contradicts supplier-provided dates.",
                "Confidence Scoring: ETA reliability tagging (High/Med/Low) for shipments without tracking IDs.",
                "Site Receiving: Mobile-first confirmation of partial or full deliveries by site personnel.",
                "Quant Reconcile: Automated mapping of received site quantities against ordered PO quantities.",
                "Exception Adjudication: PM-level review of significant delays or high-value invoice mismatches."
            ]}
            systemActions={[
                "Logistics API Poller: Real-time event subscription for shipment location and status scans.",
                "Status Lifecycle: Transition logic (Pending → Dispatched → In Transit → Delivered).",
                "Delay Intelligence: Delay flags triggered when ETA exceeds ROS (Required-on-Site) threshold.",
                "Variance Detection: Conflict triggers for quantity mismatches greater than 5%.",
                "QA Task Creation: Automated inspection triggers generated upon successful site receiving."
            ]}
            developerTriggers={[
                "Shipment_Parser",
                "Tracking_ID_Detector",
                "Logistics_API_Connector",
                "ETA_Normalizer",
                "Delay_Engine",
                "Conflict_Queue_Service",
                "Partial_Delivery_Handler"
            ]}
        />
    );
}

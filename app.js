// Main application logic for Anatomia SMART on FHIR App
class AnatomiaApp {
    constructor() {
        this.smart = null;
        this.patient = null;
        this.patientId = null;
        this.loadingElement = document.getElementById('loading');
        this.errorElement = document.getElementById('error');
        this.contentElement = document.getElementById('app-content');
    }

    async init() {
        try {
            // Initialize SMART client
            this.smart = await FHIR.oauth2.ready();
            console.log('SMART client initialized:', this.smart);

            // Get patient context
            if (this.smart.patient && this.smart.patient.id) {
                this.patientId = this.smart.patient.id;
                console.log('Patient ID:', this.patientId);
                
                // Load patient data
                await this.loadPatientData();
                
                // Load all clinical data
                await this.loadAllClinicalData();
                
                // Show the main interface
                this.showMainInterface();
                
            } else {
                throw new Error('No patient context available');
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    async loadPatientData() {
        try {
            this.patient = await this.smart.patient.read();
            console.log('Patient data loaded:', this.patient);
            this.displayPatientInfo();
        } catch (error) {
            console.error('Error loading patient data:', error);
            throw error;
        }
    }

    async loadAllClinicalData() {
        try {
            // Load all clinical data in parallel
            const [observations, allergies, conditions, medications, procedures, immunizations] = await Promise.allSettled([
                this.loadObservations(),
                this.loadAllergies(),
                this.loadConditions(),
                this.loadMedications(),
                this.loadProcedures(),
                this.loadImmunizations()
            ]);

            // Process results
            this.processResults('observations', observations);
            this.processResults('allergies', allergies);
            this.processResults('conditions', conditions);
            this.processResults('medications', medications);
            this.processResults('procedures', procedures);
            this.processResults('immunizations', immunizations);

        } catch (error) {
            console.error('Error loading clinical data:', error);
        }
    }

    processResults(type, result) {
        if (result.status === 'fulfilled') {
            console.log(`${type} loaded successfully:`, result.value);
            this.displayData(type, result.value);
        } else {
            console.error(`Error loading ${type}:`, result.reason);
            this.displayError(type, result.reason.message);
        }
    }

    async loadObservations() {
        try {
            const observations = await this.smart.patient.api.fetchAll({
                type: 'Observation',
                query: {
                    category: 'vital-signs',
                    _sort: '-date',
                    _count: 20
                }
            });
            return observations;
        } catch (error) {
            console.error('Error loading observations:', error);
            return [];
        }
    }

    async loadAllergies() {
        try {
            const allergies = await this.smart.patient.api.fetchAll({
                type: 'AllergyIntolerance',
                query: {
                    _sort: '-recordedDate',
                    _count: 10
                }
            });
            return allergies;
        } catch (error) {
            console.error('Error loading allergies:', error);
            return [];
        }
    }

    async loadConditions() {
        try {
            const conditions = await this.smart.patient.api.fetchAll({
                type: 'Condition',
                query: {
                    _sort: '-recordedDate',
                    _count: 15
                }
            });
            return conditions;
        } catch (error) {
            console.error('Error loading conditions:', error);
            return [];
        }
    }

    async loadMedications() {
        try {
            const medications = await this.smart.patient.api.fetchAll({
                type: 'MedicationRequest',
                query: {
                    _sort: '-authoredOn',
                    _count: 15
                }
            });
            return medications;
        } catch (error) {
            console.error('Error loading medications:', error);
            return [];
        }
    }

    async loadProcedures() {
        try {
            const procedures = await this.smart.patient.api.fetchAll({
                type: 'Procedure',
                query: {
                    _sort: '-performedDateTime',
                    _count: 10
                }
            });
            return procedures;
        } catch (error) {
            console.error('Error loading procedures:', error);
            return [];
        }
    }

    async loadImmunizations() {
        try {
            const immunizations = await this.smart.patient.api.fetchAll({
                type: 'Immunization',
                query: {
                    _sort: '-occurrenceDateTime',
                    _count: 10
                }
            });
            return immunizations;
        } catch (error) {
            console.error('Error loading immunizations:', error);
            return [];
        }
    }

    displayPatientInfo() {
        if (!this.patient) return;

        // Get patient name
        const name = this.getPatientName(this.patient);
        const initials = this.getPatientInitials(name);

        // Calculate age
        const age = this.calculateAge(this.patient.birthDate);

        // Update UI elements
        document.getElementById('patient-name').textContent = name;
        document.getElementById('patient-avatar').textContent = initials;
        document.getElementById('patient-gender').textContent = this.patient.gender || 'Unknown';
        document.getElementById('patient-dob').textContent = this.formatDate(this.patient.birthDate);
        document.getElementById('patient-age').textContent = age ? `${age} years` : 'Unknown';
        document.getElementById('patient-id').textContent = this.patient.id || 'Unknown';
    }

    displayData(type, data) {
        const listElement = document.getElementById(`${type}-list`);
        
        if (!data || data.length === 0) {
            listElement.innerHTML = '<div class="no-data">No data available</div>';
            return;
        }

        let html = '';
        
        switch (type) {
            case 'observations':
                html = this.renderObservations(data);
                break;
            case 'allergies':
                html = this.renderAllergies(data);
                break;
            case 'conditions':
                html = this.renderConditions(data);
                break;
            case 'medications':
                html = this.renderMedications(data);
                break;
            case 'procedures':
                html = this.renderProcedures(data);
                break;
            case 'immunizations':
                html = this.renderImmunizations(data);
                break;
        }

        listElement.innerHTML = html;
    }

    displayError(type, message) {
        const listElement = document.getElementById(`${type}-list`);
        listElement.innerHTML = `<div class="no-data">Error loading data: ${message}</div>`;
    }

    renderObservations(observations) {
        return observations.map(obs => {
            const code = this.getCodeDisplay(obs.code);
            const value = this.getObservationValue(obs);
            const date = this.formatDate(obs.effectiveDateTime || obs.effectiveInstant);
            
            return `
                <div class="resource-item">
                    <div class="resource-title">${code}</div>
                    <div class="resource-details">${value}</div>
                    <div class="resource-date">${date}</div>
                </div>
            `;
        }).join('');
    }

    renderAllergies(allergies) {
        return allergies.map(allergy => {
            const substance = this.getCodeDisplay(allergy.code);
            const reaction = allergy.reaction ? allergy.reaction.map(r => 
                this.getCodeDisplay(r.manifestation?.[0])
            ).join(', ') : 'Unknown reaction';
            const severity = allergy.reaction?.[0]?.severity || 'Unknown';
            const date = this.formatDate(allergy.recordedDate);
            
            const severityClass = severity === 'severe' ? 'critical' : 
                                severity === 'moderate' ? 'warning' : '';
            
            return `
                <div class="resource-item ${severityClass}">
                    <div class="resource-title">${substance}</div>
                    <div class="resource-details">
                        <span class="badge badge-${severity === 'severe' ? 'error' : 'warning'}">${severity}</span>
                        ${reaction}
                    </div>
                    <div class="resource-date">${date}</div>
                </div>
            `;
        }).join('');
    }

    renderConditions(conditions) {
        return conditions.map(condition => {
            const code = this.getCodeDisplay(condition.code);
            const status = condition.clinicalStatus?.coding?.[0]?.code || 'Unknown';
            const severity = condition.severity ? this.getCodeDisplay(condition.severity) : '';
            const date = this.formatDate(condition.recordedDate || condition.onsetDateTime);
            
            const statusClass = status === 'active' ? 'warning' : 'success';
            
            return `
                <div class="resource-item">
                    <div class="resource-title">${code}</div>
                    <div class="resource-details">
                        <span class="badge badge-${statusClass}">${status}</span>
                        ${severity}
                    </div>
                    <div class="resource-date">${date}</div>
                </div>
            `;
        }).join('');
    }

    renderMedications(medications) {
        return medications.map(med => {
            const medication = this.getCodeDisplay(med.medicationCodeableConcept);
            const status = med.status || 'Unknown';
            const dosage = med.dosageInstruction?.[0]?.text || 'No dosage specified';
            const date = this.formatDate(med.authoredOn);
            
            const statusClass = status === 'active' ? 'success' : 'warning';
            
            return `
                <div class="resource-item">
                    <div class="resource-title">${medication}</div>
                    <div class="resource-details">
                        <span class="badge badge-${statusClass}">${status}</span>
                        ${dosage}
                    </div>
                    <div class="resource-date">${date}</div>
                </div>
            `;
        }).join('');
    }

    renderProcedures(procedures) {
        return procedures.map(proc => {
            const code = this.getCodeDisplay(proc.code);
            const status = proc.status || 'Unknown';
            const date = this.formatDate(proc.performedDateTime || proc.performedPeriod?.start);
            
            return `
                <div class="resource-item">
                    <div class="resource-title">${code}</div>
                    <div class="resource-details">
                        <span class="badge badge-success">${status}</span>
                    </div>
                    <div class="resource-date">${date}</div>
                </div>
            `;
        }).join('');
    }

    renderImmunizations(immunizations) {
        return immunizations.map(imm => {
            const vaccine = this.getCodeDisplay(imm.vaccineCode);
            const status = imm.status || 'Unknown';
            const date = this.formatDate(imm.occurrenceDateTime);
            
            return `
                <div class="resource-item">
                    <div class="resource-title">${vaccine}</div>
                    <div class="resource-details">
                        <span class="badge badge-success">${status}</span>
                    </div>
                    <div class="resource-date">${date}</div>
                </div>
            `;
        }).join('');
    }

    // Utility functions
    getPatientName(patient) {
        if (!patient.name || !patient.name[0]) return 'Unknown Patient';
        const name = patient.name[0];
        const given = Array.isArray(name.given) ? name.given.join(' ') : name.given || '';
        const family = Array.isArray(name.family) ? name.family.join(' ') : name.family || '';
        return `${given} ${family}`.trim() || 'Unknown Patient';
    }

    getPatientInitials(name) {
        return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
    }

    calculateAge(birthDate) {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    getCodeDisplay(codeableConcept) {
        if (!codeableConcept) return 'Unknown';
        
        if (codeableConcept.text) return codeableConcept.text;
        
        if (codeableConcept.coding && codeableConcept.coding.length > 0) {
            const coding = codeableConcept.coding[0];
            return coding.display || coding.code || 'Unknown';
        }
        
        return 'Unknown';
    }

    getObservationValue(observation) {
        if (!observation.valueQuantity && !observation.valueString && !observation.valueCodeableConcept) {
            return 'No value';
        }
        
        if (observation.valueQuantity) {
            const value = observation.valueQuantity.value;
            const unit = observation.valueQuantity.unit || '';
            return `${value} ${unit}`.trim();
        }
        
        if (observation.valueString) {
            return observation.valueString;
        }
        
        if (observation.valueCodeableConcept) {
            return this.getCodeDisplay(observation.valueCodeableConcept);
        }
        
        return 'Unknown value';
    }

    showMainInterface() {
        this.loadingElement.style.display = 'none';
        this.errorElement.style.display = 'none';
        this.contentElement.style.display = 'block';
    }

    showError(message) {
        this.loadingElement.style.display = 'none';
        this.contentElement.style.display = 'none';
        this.errorElement.style.display = 'block';
        this.errorElement.textContent = message;
    }

    async refreshData() {
        try {
            this.loadingElement.style.display = 'block';
            this.contentElement.style.display = 'none';
            
            await this.loadAllClinicalData();
            
            this.loadingElement.style.display = 'none';
            this.contentElement.style.display = 'block';
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showError('Failed to refresh data: ' + error.message);
        }
    }

    exportData() {
        const patientData = {
            patient: this.patient,
            timestamp: new Date().toISOString(),
            source: 'Anatomia SMART on FHIR App'
        };
        
        const dataStr = JSON.stringify(patientData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `patient_${this.patientId}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Global functions for UI interactions
window.refreshData = () => {
    if (window.anatomiaApp) {
        window.anatomiaApp.refreshData();
    }
};

window.exportData = () => {
    if (window.anatomiaApp) {
        window.anatomiaApp.exportData();
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Anatomia app...');
    window.anatomiaApp = new AnatomiaApp();
    window.anatomiaApp.init();
});
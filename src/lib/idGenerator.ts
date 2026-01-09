const ID_PREFIX = "2026/JL/";
const START_ID_NUMBER = 25;
const STORAGE_KEY = "lastStudentIdNumber";

export function generateNextStudentId(): string {
    const lastIdStr = localStorage.getItem(STORAGE_KEY);
    let nextIdNumber = START_ID_NUMBER;

    if (lastIdStr) {
        const lastId = parseInt(lastIdStr, 10);
        if (!isNaN(lastId)) {
            nextIdNumber = lastId + 1;
        }
    }

    // Save the new ID number to ensure persistence for the next call
    // In a real app, this would happen only after successful save, 
    // but for local storage simulation we can reserve it here or handle in the save function.
    // To match the plan, we will just return the PREVIEW of the next ID here, 
    // or we can treat this as "reserving" it. 
    // Let's create a separate function to commit it, or just commit it here for simplicity.

    // Actually, standard practice for these simple local apps:
    // We usually want to generate it only when saving. 
    // So we provide a 'peek' and a 'commit'.

    return formatId(nextIdNumber);
}

export function commitNextStudentId() {
    const lastIdStr = localStorage.getItem(STORAGE_KEY);
    let nextIdNumber = START_ID_NUMBER;

    if (lastIdStr) {
        const lastId = parseInt(lastIdStr, 10);
        if (!isNaN(lastId)) {
            nextIdNumber = lastId + 1;
        }
    }

    localStorage.setItem(STORAGE_KEY, nextIdNumber.toString());
    return formatId(nextIdNumber);
}

function formatId(num: number): string {
    return `${ID_PREFIX}${num.toString().padStart(3, '0')}`;
}

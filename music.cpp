#include <iostream>
#include <string>
using namespace std;

// Node structure for linked list
class Song {
public:
    string title;
    string artist;
    Song* next;

    Song(string t, string a) {
        title = t;
        artist = a;
        next = NULL;
    }
};

class Playlist {
private:
    Song* head;
    Song* current; // used for next/previous navigation

public:
    Playlist() {
        head = NULL;
        current = NULL;
    }

    // Add song at end
    void addSongEnd(string title, string artist) {
        Song* newSong = new Song(title, artist);

        if (head == NULL) {
            head = newSong;
            cout << "Song added as first song.\n";
            return;
        }

        Song* temp = head;
        while (temp->next != NULL) temp = temp->next;

        temp->next = newSong;
        cout << "Song added to end.\n";
    }

    // Add song at beginning
    void addSongBeginning(string title, string artist) {
        Song* newSong = new Song(title, artist);
        newSong->next = head;
        head = newSong;
        cout << "Song added at the beginning.\n";
    }

    // Insert at position (1-based index)
    void insertAtPosition(string title, string artist, int pos) {
        if (pos <= 0) {
            cout << "Invalid position.\n";
            return;
        }

        if (pos == 1) {
            addSongBeginning(title, artist);
            return;
        }

        Song* newSong = new Song(title, artist);
        Song* temp = head;

        for (int i = 1; i < pos - 1 && temp != NULL; i++) {
            temp = temp->next;
        }

        if (temp == NULL) {
            cout << "Position out of range.\n";
            return;
        }

        newSong->next = temp->next;
        temp->next = newSong;
        cout << "Song inserted at position " << pos << ".\n";
    }

    // Delete song by title
    void deleteSong(string title) {
        if (head == NULL) {
            cout << "Playlist empty!\n";
            return;
        }

        Song* temp = head;
        Song* prev = NULL;

        // First song deletion
        if (temp != NULL && temp->title == title) {
            head = temp->next;
            delete temp;
            cout << "Song deleted.\n";
            return;
        }

        // Other song deletion
        while (temp != NULL && temp->title != title) {
            prev = temp;
            temp = temp->next;
        }

        if (temp == NULL) {
            cout << "Song not found.\n";
            return;
        }

        prev->next = temp->next;
        delete temp;
        cout << "Song deleted.\n";
    }

    // Search song
    void searchSong(string title) {
        Song* temp = head;
        int pos = 1;

        while (temp != NULL) {
            if (temp->title == title) {
                cout << "Song found at position " << pos << ".\n";
                return;
            }
            temp = temp->next;
            pos++;
        }

        cout << "Song not found.\n";
    }

    // Display playlist
    void displayPlaylist() {
        if (head == NULL) {
            cout << "Playlist is empty.\n";
            return;
        }

        Song* temp = head;
        int index = 1;

        cout << "\n--- Playlist ---\n";
        while (temp != NULL) {
            cout << index++ << ". " << temp->title << " - " << temp->artist << endl;
            temp = temp->next;
        }
        cout << "----------------\n";
    }

    // Count total songs
    void countSongs() {
        int count = 0;
        Song* temp = head;

        while (temp != NULL) {
            count++;
            temp = temp->next;
        }

        cout << "Total songs: " << count << endl;
    }

    // Play next song (navigation)
    void playNext() {
        if (current == NULL) current = head;

        if (current == NULL) {
            cout << "Playlist empty.\n";
            return;
        }

        cout << "Now playing: " << current->title << " - " << current->artist << endl;

        if (current->next != NULL)
            current = current->next;
        else
            cout << "You reached the end of playlist.\n";
    }

    // Reset navigation
    void resetPlay() {
        current = head;
        cout << "Playback reset to start.\n";
    }
};

int main() {
    Playlist p;
    int choice, pos;
    string title, artist;

    while (true) {
        cout << "\n--- Music Playlist Manager ---\n";
        cout << "1. Add song at end\n";
        cout << "2. Add song at beginning\n";
        cout << "3. Insert song at position\n";
        cout << "4. Delete a song\n";
        cout << "5. Search a song\n";
        cout << "6. Display playlist\n";
        cout << "7. Count songs\n";
        cout << "8. Play next\n";
        cout << "9. Reset play\n";
        cout << "10. Exit\n";
        cout << "Enter your choice: ";
        cin >> choice;

        switch (choice) {
        case 1:
            cout << "Enter title: ";
            cin >> title;
            cout << "Enter artist: ";
            cin >> artist;
            p.addSongEnd(title, artist);
            break;

        case 2:
            cout << "Enter title: ";
            cin >> title;
            cout << "Enter artist: ";
            cin >> artist;
            p.addSongBeginning(title, artist);
            break;

        case 3:
            cout << "Enter title: ";
            cin >> title;
            cout << "Enter artist: ";
            cin >> artist;
            cout << "Enter position: ";
            cin >> pos;
            p.insertAtPosition(title, artist, pos);
            break;

        case 4:
            cout << "Enter title to delete: ";
            cin >> title;
            p.deleteSong(title);
            break;

        case 5:
            cout << "Enter title to search: ";
            cin >> title;
            p.searchSong(title);
            break;

        case 6:
            p.displayPlaylist();
            break;

        case 7:
            p.countSongs();
            break;

        case 8:
            p.playNext();
            break;

        case 9:
            p.resetPlay();
            break;

        case 10:
            cout << "Exiting...\n";
            return 0;

        default:
            cout << "Invalid choice!\n";
        }
    }
}
